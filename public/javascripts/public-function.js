function blankCheck(value) {
    if(value === "" || value === null)
        return true;
    const blank_pattern = /^s+|\s+$/g;
    return (value.replace(blank_pattern, "") === "");
}

function createToast(type, msg) {
    toastr.option  = {
        "closeButton": true,
        "debug": false,
        "progressBar": false,
        "preventDuplicates": false,
        "positionClass": "toast-top-right",
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "300",
        "timeOut": "15000",
        "extendedTimeOut": "300",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    };

    toastr[type](msg);
}