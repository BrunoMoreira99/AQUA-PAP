window.addEventListener('load', () => {
        const burger = document.querySelector('.nav-toggle');
        if (burger) {
            const menu = document.querySelector('.nav-menu');
            burger.addEventListener('click', () => {
                $(menu).slideToggle();
                burger.classList.toggle('is-active');
                menu.classList.toggle('is-active');
            });
        }

    console.log("%cSTOP!", "font: 10em monospace; color: red; font-weight: bold;");
    console.log("%cThis is a browser feature intended for developers. If someone told you to copy-paste something here to enable a feature or “hack” someone’s account, it is a scam and will give them access to your account.", "font: 2em sans-serif; color: grey;");
});

function parseGET() {
    var $_GET = {};
    if (document.location.toString().indexOf('?') !== -1) {
        var query = document.location.toString().replace(/^.*?\?/, '').replace(/#.*$/, '').split('&');

        for (let i = 0, l = query.length; i < l; i++) {
           let aux = decodeURIComponent(query[i]).split('=');
           $_GET[aux[0]] = aux[1];
        }
    }
    return $_GET;
}

function checkValidityOf(i) {
    if (!i.checkValidity()) {
        if (!$(i).hasClass('is-danger')) {
            $(i).addClass('is-danger');
            $(i).after(`<span class="help is-danger">${i.validationMessage}</span>`);
            $(i).after('<span class="icon is-small is-right"><i class="fa fa-warning"></i></span>');
        } else $("span.help", i).text(i.validationMessage);
        return false;
    } else if ($(i).hasClass('is-danger')) {
        $(i).removeClass('is-danger');
        $(i).nextAll().remove();
    } return true;
}