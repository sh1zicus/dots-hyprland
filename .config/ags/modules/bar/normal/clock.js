const { Gtk } = imports.gi;
import Widget from "resource:///com/github/Aylur/ags/widget.js";

// Creating the ClockBarWidget as an object, adding necessary methods directly to the object
const ClockBarWidget = () => {
    // Define the widget
    const widget = Widget.Box({
        className: "clock-bar-widget", // Unique CSS class for styling
        children: [
            Widget.Label({
                text: "Clock", // Placeholder text
                className: "clock-bar-text", // Unique class for the text
            }),
        ],
        setup: () => {
            widget.updateClock(); // Initialize clock update when widget is created
        },
    });

    // Adding clock updating functionality
    widget.updateClock = function () {
        const label = widget.get_child_at(0); // Assuming the clock label is the first child
        const updateClockTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString();
            label.text = timeString; // Update the time every second
        };

        updateClockTime(); // Initial clock update
        widget.clockInterval = setInterval(updateClockTime, 1000); // Update clock every second
    };

    // Cleanup the interval when the widget is removed
    widget.cleanup = function () {
        clearInterval(widget.clockInterval); // Clear the interval on cleanup
    };

    return widget; // Return the widget object
};

// Export the ClockBarWidget to be used in other modules
export default ClockBarWidget;
