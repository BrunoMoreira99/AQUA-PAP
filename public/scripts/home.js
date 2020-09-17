window.addEventListener("load", () => {
    particlesJS.load('particles-js', 'configs/particles-home.json', () => {
        var canvas = document.getElementsByTagName('canvas')[0];
        canvas.height = document.getElementById('header-body').clientHeight;
        canvas.style.height = `${canvas.height}px`;
    });
    $(".loading").fadeOut("slow");

    $("#signin-btn").click(function () {
        $("#signin-modal").addClass("is-active");
        $("#signin-modal").fadeIn();
        $("#signin-modal .modal-content").slideDown();

        $('html, body').css({
            'overflow': 'hidden',
            'height': '100%'
        });
    });

    $("#signup-btn").click(function () {
        $("#signup-modal").addClass("is-active");
        $("#signup-modal").fadeIn();
        $("#signup-modal .modal-content").slideDown();

        $('html, body').css({
            'overflow': 'hidden',
            'height': '100%'
        });
    });

    $(".modal-close, .modal-background").click(function () {
        $(this).siblings(".modal-content").slideUp();
        $(this).parent().fadeOut(function () {
            $(this).removeClass("is-active");
            $(this).find(".notification").slideUp();
            $(this).find("input.is-danger").removeClass('is-danger');
            $(this).find("span.help, span.icon > i.fa.fa-warning").remove();
        });

        $('html, body').css({
            'overflow': 'auto',
            'height': 'auto'
        });
    });

    var $signin_form = $("#signin-form");
    $signin_form.submit(e => {
        e.preventDefault(); // Prevent default submission since we're using Ajax instead.

        let valid = true;
        $("#signin-form input").each((i, input) => { if (!checkValidityOf(input)) valid = false; });
        if (!valid) return false;

        $("#signin-form button").addClass('is-loading');
        $signin_form.prev().slideUp();

        $.ajax({
            url: '/login',
            type: 'post',
            data: $signin_form.serialize(),
            success: function (res) {
                window.location = res.redirect;
            },
            error: function (e) {
                $signin_form.prev().text(e.responseJSON).slideDown();
                $("#signin-form button").removeClass('is-loading');
            }
        });
    });

    $("#signup-form").submit(function (e) {
        e.preventDefault(); // Prevent default submission since we're using Ajax instead.

        let valid = true;
        $('input', this).each((i, input) => { if (!checkValidityOf(input)) valid = false; });
        if (!valid) return false;

        let username = $('input[name="username"]', this)[0];
        let email = $('input[name="email"]', this)[0];

        if (!/^[a-zA-Z0-9]+$/.test(username.value)) {
            if ($(username).hasClass('is-danger')) {
                $(username).nextAll('span').text("O nome de utilizador não deve ter caracteres especiais!");
            } else {
                $(username).addClass('is-danger').after('<span class="icon is-small is-right"><i class="fa fa-warning"></i></span><span class="help is-danger">O nome de utilizador não deve ter caracteres especiais!</span>');
            }
            return false;
        }

        let pass = $('input[name="password"]', this)[0];
        let confPass = $('input[name="conf-password"]', this)[0];
        if (pass.value != confPass.value) {
            if ($(confPass).hasClass('is-danger')) {
                $(confPass).nextAll('span').text("As palavras-passe não coincidem!");
            } else {
                $(confPass).addClass('is-danger').after('<span class="icon is-small is-right"><i class="fa fa-warning"></i></span><span class="help is-danger">As palavras-passe não coincidem!</span>');
            }
            return false;
        }

        $('button', this).addClass('is-loading');

        $.ajax({
            url: '/signup',
            type: 'post',
            data: $(this).serialize(),
            success: res => {
                window.location = res.redirect;
            },
            error: e => {
                if (e.responseJSON[0]) {
                    if (!$(username).hasClass('is-danger')) {
                        $(username).addClass('is-danger').after(`<span class="icon is-small is-right"><i class="fa fa-warning"></i></span><span class="help is-danger">${e.responseJSON[0]}</span>`);
                    } else $(username).nextAll('span').text(e.responseJSON[0]);
                } else if ($(username).hasClass('is-danger')) {
                    $(username).removeClass('is-danger');
                    $(username).nextAll().remove();
                }
                if (e.responseJSON[1]) {
                    if (!$(email).hasClass('is-danger')) {
                        $(email).addClass('is-danger').after(`<span class="icon is-small is-right"><i class="fa fa-warning"></i></span><span class="help is-danger">${e.responseJSON[1]}</span>`);
                    } else $(email).nextAll('span').text(e.responseJSON[1]);
                } else if ($(email).hasClass('is-danger')) {
                    $(email).removeClass('is-danger');
                    $(email).nextAll().remove();
                }
                $('button', this).removeClass('is-loading');
            }
        });
    });

    window.cookieconsent.initialise({
        "palette":{
            "popup":{
                "background":"#edeff5",
                "text":"#838391"
            },
            "button":{
                "background":"#4b81e8"
            }
        },
        "content":{
            "message":"Este site usa cookies para melhorar a sua experiência. Ao continuar a navegar estará a aceitar a sua utilização.",
            "dismiss":"OK",
            "link":"Saiba mais"
        },
        "theme": "edgeless"
    });
});

window.addEventListener("scroll", () => {
    var title = $(".hero-body .container");
    var title_bottom = title.offset().top + title.height();
    title.css("opacity", 0 + (title_bottom - $("body").scrollTop()) / title_bottom);

    var canvas = $(".particles-js-canvas-el");
    var canvas_bottom = $(canvas).offset().top + $(canvas).height();
    canvas.css("opacity", 0 + (canvas_bottom - $("body").scrollTop()) / canvas_bottom);
});