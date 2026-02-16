function initDateRangePicker() {
    if (typeof jQuery === "undefined" || !jQuery.fn.daterangepicker || typeof moment === "undefined") {
        return;
    }

    var $inputs = jQuery('#checkin,#checkout');
    if (!$inputs.length) return;

    $inputs.each(function () {
        var picker = jQuery(this).data('daterangepicker');
        if (picker) {
            picker.remove();
        }
    });

    var today = moment();
    var tomorrow = moment().add(1, 'days');

    $inputs.daterangepicker({
        showISOWeekNumbers: true,
        autoUpdateInput: false,
        autoApply: true,
        timePicker: false,
        locale: {
            format: "MMM DD, YYYY",
            firstDay: 1
        },
        startDate: today,
        endDate: tomorrow,
        minDate: today,
        opens: "right"
    }, function(start, end) {
        jQuery('#checkin').val(start.format("MMM DD, YYYY"));
        jQuery('#checkout').val(end.format("MMM DD, YYYY"));
    });

    jQuery('#checkin').val(today.format("MMM DD, YYYY"));
    jQuery('#checkout').val(tomorrow.format("MMM DD, YYYY"));
}

window.initDateRangePicker = initDateRangePicker;

jQuery(function () {
    initDateRangePicker();
});
