import ical from  "node-ical"

    const data = await ical.async.fromURL(
      "https://ics.fixtur.es/v2/home/manchester-city.ics"
    );
    try {
      for (let k in data) {
        if (data.hasOwnProperty(k)) {
          const event = data[k];
          if (event.type == "VEVENT") {
            if (new Date(event.start).setHours(0,0,0,0) == new Date().setHours(0,0,0,0)) {
              const e = {
                date: new Date(event.start).toLocaleDateString("en-GB"),
                start: new Date(event.start).toLocaleTimeString(),
                end: new Date(event.end).toLocaleTimeString(),
                title: event.summary
              };

              console.log(`Notice! A football match is on today at the Etihad! \n **${e.title}**  \n\n **Date:** ${e.date} \n **Start time:** ${e.start} \n **End time:** ${e.end} \n\n Roads and public transport will be extremely busy before and after the event, and on street parking will be extremely limited.`)
            }
          }
        }
      }
    } catch (e) {
      console.log(e);
    }
