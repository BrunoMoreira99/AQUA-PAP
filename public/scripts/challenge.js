window.addEventListener("load", () => {
    if ($("#editor").length) {
        var editor = ace.edit("editor");
        editor.setOptions({
            mode: "ace/mode/c_cpp",
            theme: "ace/theme/monokai",
            maxLines: Infinity,
            showPrintMargin: false
        });
    }

    for (let i = 0; i < $('.eg-container').length; i++) {
        let editor = ace.edit("editor_eg_" + i);
        editor.setOptions({
            mode: "ace/mode/plain_text",
            theme: "ace/theme/textmate",
            maxLines: Infinity,
            showPrintMargin: false,
            readOnly: true,
            highlightActiveLine: false,
            highlightGutterLine: false,
            newLineMode: "windows",
            fontSize: "12px"
        });
        editor.renderer.$cursorLayer.element.style.display = "none";
        editor.onBlur = () => { editor.session.selection.clearSelection() }
    }

    var extension = "";

    $('#source-code').change(function () {
        extension = this.files[0].name.split('.').pop();
        if (/cpp|c|java/.test(extension)) {
            var fr = new FileReader();

            fr.onload = function () {
                editor.setValue(fr.result, 1);
            }

            fr.readAsText(this.files[0], 'ISO-8859-1');

            var modelist = ace.require("ace/ext/modelist");
            editor.session.setMode(modelist.getModeForPath(this.files[0].name).mode);
        } else {
            $(this).val('');
        }
    });

    $(".modal-background, button.delete, a.button").click(() => {
        $(".modal-card").slideUp(() => {
            $(".modal").fadeOut(function () {
                $(this).removeClass("is-active");

                $('html, body').css({
                    'overflow': 'auto',
                    'height': 'auto'
                });
            });
        });
    });

	$("a.print").click(() => {
		$(".unprintable, nav").css("display", "none");
		$(".wording").css({ "box-shadow": "none", "border": "1px solid #CCC" });
		window.print();
		$(".unprintable, nav").css("display", "");
		$(".wording").css({ "box-shadow": "", "border": "" });
	});

    if ($("form")) {
        $("form").submit(function (e) {
            e.preventDefault();

            if (editor.getValue().trim()) {
                let language = editor.session.getMode().$id.split('/').pop();
                if (language === 'c_cpp') {
                    language = /c(pp)?/.test(extension) ? extension : 'cpp';
                }

                $.ajax({
                    url: "/api/challenge",
                    type: "post",
                    data: {
                        challengeID: $('input[name="challengeID"]').val(),
                        fileName: $('#source-code')[0].files[0].name,
                        code: editor.getValue().trim(),
                        language: language
                    },
                    success: function (res) {
                        switch (res.result) {
                            case "ACCEPTED":
                                $(".level-container .tag").text(res.stats.level);
                                $(".level-container h6").text((res.stats.requiredXP - res.stats.levelXP) + " XP para o próximo nível");
                                if (res.stats.levelUP) $(".level-container progress").attr("value", 0);
                                $("p.modal-card-title").text("Aceite");
                                $(".result-message").text("Bom trabalho, o teu código passou por todos os casos de teste!");
                                $(".level-container").fadeIn(function() {
                                    $("progress", this).attr("value", res.stats.levelXP / res.stats.requiredXP);
                                });
                                $("form").replaceWith('<div class="is-pulled-right"><h4 class="subtitle is-4">Já Resolvido</h4></div>');
                                break;
                            case "WRONG_ANSWER":
                                $("p.modal-card-title").text("Resposta Errada");
                                $(".result-message").text("O teu código não passou por um ou mais casos de teste.");
                                break;
                            case "PRESENTATION_ERROR":
                                $("p.modal-card-title").text("Erro de Apresentação");
                                $(".result-message").text("O teu código possui um ou mais erros de apresentação.");
                                break;
                            default: $("p.modal-card-title").text("Erro Desconhecido"); break;
                        }

                        $(".modal").addClass("is-active");
                        $(".modal").fadeIn(() => {
                            $(".modal-card").slideDown();
                        });

                        $('html, body').css({
                            'overflow': 'hidden',
                            'height': '100%'
                        });
                    },
                    error: function (e) {
                        // console.log(e);
                    }
                });
            }
        });
    }
});