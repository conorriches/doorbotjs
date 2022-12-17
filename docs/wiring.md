# Wiring and components
These are the connections at the bottom of the board

## Making changes
If there's a difference between here and the labels, follow the wiring and check the code. Then update the labels or here to whatever is correct.

## Components
As is, there's space for:
* 4x3 keypad, matrix input
* Wiegand input (can be any device if it communicates over D0, D1)
* 3 inputs
* 2 outputs, both with NO and NC contacts

## Power
* The board is powered by 12v
* This also powers any 12v reliant devices such as the fob reader
* The voltage is reduced internally to 5v for the Pi and other items.

## Locks
If using a fail-safe lock, one which requires power in order to be active, please consider backup power supplies, as a power failure would release the door.

If using a fail-secure lock, one which requires power in order to release the door, please ensure there is an alternative way to release the door should the access system fail.

In all cases, all entrances and exits must conform to fire safety requirements.

## Wiring diagram
<table>
<thead>
<tr>
<th>Connection #</th>
<th>Category</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
    <td>1</td>
    <td>🔴 Power</td>
    <td>12v</td>
</tr>
<tr>
    <td>2</td>
    <td>🔴 Power</td>
    <td>0v</td>
</tr>
<tr>
    <td>3</td>
    <td>🔵 Keypad</td>
    <td>Row 1</td>
</tr>
<tr>
    <td>4</td>
    <td>🔵 Keypad</td>
    <td>Row 2</td>
</tr>
<tr>
    <td>5</td>
    <td>🔵 Keypad</td>
    <td>Row 3</td>
</tr>
<tr>
    <td>6</td>
    <td>🔵 Keypad</td>
    <td>Row 4</td>
</tr>
<tr>
    <td>7</td>
    <td>🔵 Keypad</td>
    <td>Col 1</td>
</tr>
<tr>
    <td>8</td>
    <td>🔵 Keypad</td>
    <td>Col 2</td>
</tr>
<tr>
    <td>9</td>
    <td>🔵 Keypad</td>
    <td>Col 3</td>
</tr>
<tr>
    <td>10</td>
    <td>🟢 Input</td>
    <td>Request To Exit</td>
</tr>
<tr>
    <td>11</td>
    <td>🟢 Input</td>
    <td>Doorbell</td>
</tr>
<tr>
    <td>12</td>
    <td>🟢 Input</td>
    <td>N/A</td>
</tr>

<tr>
    <td>13</td>
    <td>🔴 Power</td>
    <td>12v</td>
</tr>
<tr>
    <td>14</td>
    <td>🔴 Power</td>
    <td>0v</td>
</tr>
<tr>
    <td>15</td>
    <td>🟡 Wiegand</td>
    <td>D0</td>
</tr>
<tr>
    <td>16</td>
    <td>🟡 Wiegand</td>
    <td>D1</td>
</tr>
<tr>
    <td>17</td>
    <td>🟡 Wiegand</td>
    <td>Beep</td>
</tr>
<tr>
    <td>18</td>
    <td>🟡 Wiegand</td>
    <td>LED</td>
</tr>
<tr>
    <td>19</td>
    <td>🟠 Output</td>
    <td>Output 1 - Normally Open</td>
</tr>
<tr>
    <td>20</td>
    <td>🟠 Output</td>
    <td>Output 1 - Common</td>
</tr>
<tr>
    <td>21</td>
    <td>🟠 Output</td>
    <td>Output 1 - Normally Closed</td>
</tr>
<tr>
    <td>22</td>
    <td>🟠 Output</td>
    <td>Output 2 - Normally Open</td>
</tr>
<tr>
    <td>23</td>
    <td>🟠 Output</td>
    <td>Output 2 - Common</td>
</tr>
<tr>
    <td>24</td>
    <td>🟠 Output</td>
    <td>Output 2 - Normally Closed</td>
</tr>
</tbody>
</table>