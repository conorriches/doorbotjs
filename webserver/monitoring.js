import fs from "fs/promises";
import { parse } from "csv-parse/sync";

const HOUR = 1000 * 60 * 60;
const MEMBER_LIST_MAX_AGE_HOURS = 6;
const MEMBER_LIST_MIN_BYTES = 50;
const LAST_ACTIVITY_FILE = "./logs/last_activity_timestamp.json";

export const MONITORED_PROCESSES = [
  "access",
  "webview",
  "updatememberlist",
  "announceEvents",
];

/**
 * Counts valid member rows in members.csv.
 * A valid row has at least one non-empty field in the first column.
 */
async function countMemberRows() {
  const content = await fs.readFile("members.csv", "utf8");
  const records = parse(content, { skip_empty_lines: true, relax_column_count: true });
  return records.filter((r) => r.length > 0 && String(r[0]).trim() !== "").length;
}

export async function getMembersListStatus() {
  try {
    const stat = await fs.stat("members.csv");
    const ageMs = Date.now() - stat.mtime;
    const ageHours = Math.round((ageMs / HOUR) * 10) / 10;

    let count = 0;
    try {
      count = await countMemberRows();
    } catch {
      // unparseable file — treat count as 0
    }

    return {
      present: true,
      sizeBytes: stat.size,
      healthy: stat.size >= MEMBER_LIST_MIN_BYTES,
      ageHours,
      fresh: ageHours <= MEMBER_LIST_MAX_AGE_HOURS,
      empty: count === 0,
      count,
      maxAgeHours: MEMBER_LIST_MAX_AGE_HOURS,
    };
  } catch {
    return {
      present: false,
      sizeBytes: 0,
      healthy: false,
      ageHours: null,
      fresh: false,
      empty: true,
      count: 0,
      maxAgeHours: MEMBER_LIST_MAX_AGE_HOURS,
    };
  }
}

export async function getLastMemberActivityTimestamp() {
  try {
    const content = await fs.readFile(LAST_ACTIVITY_FILE, "utf-8");
    const data = JSON.parse(content);
    return data.timestamp || null;
  } catch {
    return null;
  }
}

export async function getErrorLogStatus(processName) {
  try {
    const stat = await fs.stat(`logs/error/${processName}.log`);
    return { present: true, size: stat.size, hasErrors: stat.size > 0 };
  } catch {
    return { present: false, size: 0, hasErrors: false };
  }
}

export function getPm2Processes(pm2) {
  return new Promise((resolve) => {
    pm2.connect((err) => {
      if (err) {
        return resolve({ connected: false, processes: {} });
      }

      pm2.list((err, list) => {
        pm2.disconnect();

        if (err) {
          return resolve({ connected: true, processes: {} });
        }

        const processes = {};
        for (const name of MONITORED_PROCESSES) {
          const proc = list.find((p) => p.name === name);
          if (proc) {
            processes[name] = {
              status: proc.pm2_env.status,
              uptime:
                proc.pm2_env.status === "online"
                  ? Date.now() - proc.pm2_env.pm_uptime
                  : null,
              restarts: proc.pm2_env.restart_time,
            };
          } else {
            processes[name] = {
              status: "not_found",
              uptime: null,
              restarts: null,
            };
          }
        }

        resolve({ connected: true, processes });
      });
    });
  });
}

export async function recordMemberActivity() {
  try {
    const data = { timestamp: Date.now() };
    await fs.writeFile(LAST_ACTIVITY_FILE, JSON.stringify(data), "utf-8");
  } catch (e) {
    // Silently fail — don't crash access on a write error
    console.error("Failed to write last activity timestamp:", e.message);
  }
}

export function deriveOverallStatus({ accessStatus, membersStatus, errorLogs }) {
  const failReasons = [];
  const degradedReasons = [];

  if (accessStatus !== "online")
    failReasons.push(`access process is ${accessStatus}`);

  if (!membersStatus.present) {
    failReasons.push("members.csv is missing");
  } else {
    if (membersStatus.empty)
      degradedReasons.push("members.csv is empty");
    if (!membersStatus.fresh)
      degradedReasons.push(
        `members.csv is ${membersStatus.ageHours}h old (max ${MEMBER_LIST_MAX_AGE_HOURS}h)`
      );
  }

  if (failReasons.length > 0)
    return { status: "fail", reasons: [...failReasons, ...degradedReasons] };

  const errorWarnings = Object.entries(errorLogs)
    .filter(([, log]) => log.hasErrors)
    .map(([name]) => `${name} has errors in its error log`);

  degradedReasons.push(...errorWarnings);

  if (degradedReasons.length > 0)
    return { status: "degraded", reasons: degradedReasons };

  return { status: "ok", reasons: [] };
}
