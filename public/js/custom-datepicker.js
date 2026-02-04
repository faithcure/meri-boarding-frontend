var today = moment();
var tomorrow = moment().add(1, 'days');

$('#checkin,#checkout').daterangepicker({
    showISOWeekNumbers: true,
    autoUpdateInput: false,
    autoApply: true,
    timePicker: false,
    locale: {
        format: "MMM DD, YYYY",   // <--- add year here
        firstDay: 1
    },
    startDate: today,
    endDate: tomorrow,
    minDate: today,
    opens: "right",
}, function(start, end) {

    // Update fields when user selects new dates
    $('#checkin').val(start.format("MMM DD, YYYY"));
    $('#checkout').val(end.format("MMM DD, YYYY"));
});

//  Set default values on page load
$('#checkin').val(today.format("MMM DD, YYYY"));
$('#checkout').val(tomorrow.format("MMM DD, YYYY"));
