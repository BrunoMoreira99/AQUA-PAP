window.addEventListener("load", () => {
    $(".menu li").click(function () {
        $(".menu li").removeClass('is-active');
        $(this).addClass('is-active');
    });

    $(".privacy").click(function () {
        let icon = $('i', this);
        if (icon.hasClass('fa-eye')) {
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
            $(this).attr('value', 0);
        } else {
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
            $(this).attr('value', 1);
        }
    });

    $(".avatar button").click(function (e) {
        e.preventDefault();

        $(".avatar img").attr('src', $(this).attr('gravatar') + '?s=200');
    });

    const checkmark = $(".box .icon");
    $("input[name='newpassword']").keyup(function () {
        if ($(this).val().length >= 8) $(checkmark[0]).removeClass('unchecked').addClass('checked');
        else $(checkmark[0]).removeClass('checked').addClass('unchecked');
        if (/(?=.*?[A-Z])/.test($(this).val())) $(checkmark[1]).removeClass('unchecked').addClass('checked');
        else $(checkmark[1]).removeClass('checked').addClass('unchecked');
        if (/(?=.*?[a-z])/.test($(this).val())) $(checkmark[2]).removeClass('unchecked').addClass('checked');
        else $(checkmark[2]).removeClass('checked').addClass('unchecked');
        if (/(?=.*?[0-9])/.test($(this).val())) $(checkmark[3]).removeClass('unchecked').addClass('checked');
        else $(checkmark[3]).removeClass('checked').addClass('unchecked');
        if (/(?=.*?[#?!@$%^&*-])/.test($(this).val())) $(checkmark[4]).removeClass('unchecked').addClass('checked');
        else $(checkmark[4]).removeClass('checked').addClass('unchecked');
        $('.progress').val($(checkmark).filter('.checked').length);
    });

    $('#profileForm').submit(function (e) {
        e.preventDefault(); // Prevent default submission since we're using Ajax instead.

        const data = new FormData(this);
        data.append('useGravatar', $(".avatar img").attr('src') == $(".avatar button").attr('gravatar'));
        for (const privacy of $(".privacy")) {
            data.append($(privacy).attr('name'), Boolean(parseInt($(privacy).attr('value'))));
        }

        $.ajax({
            url: '/api/settings',
            type: 'post',
            data: data,
            cache: false,
            contentType: false,
            processData: false,
            success: function () {
                $("article .profile").show();
                $("article").addClass('is-info').slideDown();
            },
            error: function (e) {
                $("article .error").show();
                $("article").addClass('is-danger').slideDown();
            }
        });
    });

    $('#accountForm').submit(function (e) {
        e.preventDefault(); // Prevent default submission since we're using Ajax instead.

        let valid = true;
        $('input', this).each((i, input) => { if (!checkValidityOf(input)) valid = false; });
        if ($('input[name="newpassword"]').val() != $('input[name="confpassword"]').val()) {
            $('input[name="confpassword"]').addClass('is-danger');
            $('input[name="confpassword"]').after(`<span class="help is-danger">As palavras-passe não coincidem!</span>`);
            $('input[name="confpassword"]').after('<span class="icon is-small is-right"><i class="fa fa-warning"></i></span>');
            valid = false;
        }
        if (!valid) return false;

        $.ajax({
            url: '/api/ChangePassword',
            type: 'post',
            data: $(this).serialize(),
            success: function () {
                $("article .account").show();
                $("article").addClass('is-info').slideDown();
            },
            error: function (e) {
                if (e.status === 401) {
                    $('input[name="currentpassword"]').addClass('is-danger');
                    $('input[name="currentpassword"]').after(`<span class="help is-danger">A sua palavra-passe atual está incorreta!</span>`);
                    $('input[name="currentpassword"]').after('<span class="icon is-small is-right"><i class="fa fa-warning"></i></span>');
                } else {
                    $("article .error").show();
                    $("article").addClass('is-danger').slideDown();
                }
            }
        });
    });
});