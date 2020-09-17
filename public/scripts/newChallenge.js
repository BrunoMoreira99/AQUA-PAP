var eg_editors = {};

function loadEgEditors(count) {
    eg_editors[count] = { i: null, o: null };

    $('.editor_eg:not(.ace_editor)').each(function () {
        const editor_eg = ace.edit(this);
        editor_eg.setOptions({
            mode: "ace/mode/plain_text",
            theme: "ace/theme/textmate",
            maxLines: Infinity,
            showPrintMargin: false,
            highlightActiveLine: false,
            highlightGutterLine: false,
            wrap: true,
            newLineMode: "windows",
            fontSize: "12px"
        });
        editor_eg.setValue("");
        editor_eg.$blockScrolling = Infinity;

        editor_eg.on('focus', () => $(this).parent().addClass('is-active'));

        editor_eg.on('blur', () => $(this).parent().removeClass('is-active'));

        eg_editors[count][$(this).attr('class').split(' ')[1]] = editor_eg;
    });
}

window.addEventListener("load", () => {
    var wording = new SimpleMDE({
        element: document.getElementById("wording"),
        spellChecker: false,
        tabSize: 4,
        status: false,
        shortcuts: {
            drawImage: null,
            drawLink: null,
            cleanBlock: null,
            toggleFullScreen: null,
            toggleSideBySide: null
        },
        toolbar: ["bold", "italic", "|", "heading-1", "heading-2", "|", "code", "quote", "|", "unordered-list", "ordered-list", "|", "table", "horizontal-rule", "|", "preview"],
        toolbarTips: false,
		previewRender: function (markdown, preview) {
			$(".editor-preview").addClass('content');
			$.ajax({
				url: "/api/RenderMarkdown",
				type: "post",
				data: { markdown: markdown },
				success: result => {
					preview.innerHTML = result;
				}
			});
			return "";
		}
    });
    wording.codemirror.on('focus', () => $(".editor-toolbar, .CodeMirror").addClass('is-active'));
    wording.codemirror.on('blur', () => $(".editor-toolbar, .CodeMirror").removeClass('is-active'));

    var editor = ace.edit("editor");
    editor.setOptions({
        mode: "ace/mode/c_cpp",
        theme: "ace/theme/monokai",
        maxLines: Infinity,
        showPrintMargin: false,
        readOnly: true
    });
    editor.$blockScrolling = Infinity;

    var eg_count = 1;
    loadEgEditors(eg_count);

    var extension = "";

    $('#source-code').change(function () {
        $(this).next().text(this.files[0].name);
        extension = this.files[0].name.split('.').pop();
        if (/cpp|c|java/.test(extension)) {
            var fr = new FileReader();

            fr.onload = function () {
                editor.setValue(fr.result, 1);
            }

            fr.readAsText(this.files[0], 'ISO-8859-1');

            var modelist = ace.require("ace/ext/modelist");
            editor.session.setMode(modelist.getModeForPath(this.files[0].name).mode);
            editor.setReadOnly(false);
        } else {
            $(this).val('');
        }
    });

    $('#inputs').change(function () {
        $(this).next().text(this.files.length + (this.files.length == 1 ? " input selecionado" : " inputs selecionados"));
    });

    var animationFinished = true;

    $('span.add').click(function () {
        if (animationFinished && ++eg_count <= 6) {
            animationFinished = false;
            const element = ((eg_count - 1) % 2 == 0) ? $(this).prev().clone().empty().append($(this).prev().children().last().clone()) : $(this).prev().children().last().clone();

            element.find('.tag.is-pulled-right').eq(0).text(eg_count).nextAll().remove().end().parent().append("<div class='editor_eg i'></div>");
            element.find('.tag.is-pulled-right').eq(1).text(eg_count).nextAll().remove().end().parent().append("<div class='editor_eg o'></div>");

            element.css("display", "none");

            if (!((eg_count - 1) % 2)) $(this).prev().after(element);
            else $(this).prev().children().last().after(element);

            loadEgEditors(eg_count);

            $(element).slideDown(() => {
                animationFinished = true;
            });

            if (eg_count == 6) $(this).fadeOut();
        }
    });

    $('.container').on('click', '.eg-container', function () {
        eg_editors[$(this).find(".tag").eq(1).text()][$(this).find(".tag").eq(0).text()[0].toLowerCase()].focus();
    });

    $("form").submit(function (e) {
        e.preventDefault();

        let valid = true;
        $("input[type='text']").each((i, input) => { checkValidityOf(input) || (valid = false) });

        if (!$("input[name='difficulty']:checked").val()) {
            if (!$("input[name='difficulty']").parent().parent().next().is('span.help.is-danger')) {
                $("input[name='difficulty']").parent().parent().after('<span class="help is-danger" style="margin-top: 10px;">É obrigatório selecionar uma dificuldade.</span>');
            }
            valid = false;
        } else if ($("input[name='difficulty']").parent().parent().next().is('span.help.is-danger')) {
            $("input[name='difficulty']").parent().parent().next().remove();
        }

        const formData = new FormData(this);

        if (editor.getValue().trim()) {
            if ($(".editor-container").hasClass('is-danger')) {
                $(".editor-container").removeClass('is-danger');
                $(".editor-container").next().remove();
            }

            let language = editor.session.getMode().$id.split('/').pop();
            if (language === 'c_cpp') {
                language = /c(pp)?/.test(extension) ? extension : 'cpp';
            }

            formData.append("language", language);
            formData.append("code", editor.getValue().trim());
            formData.append("fileName", $('#source-code')[0].files[0].name);
        } else {
            if (!$(".editor-container").hasClass('is-danger')) {
                $(".editor-container").addClass('is-danger');
                $(".editor-container").after('<span class="help is-danger" style="margin-top: 10px;">É obrigatório inserir o código fonte.</span>');
            }
            valid = false;
        }

        if (wording.value().trim().length) {
            if ($(".CodeMirror").hasClass('is-danger')) {
                $(".CodeMirror, .editor-toolbar").removeClass('is-danger');
                $(".editor-preview-side").next().remove();
            }

            formData.append("wording", wording.value().trim());
        } else {
            if (!$(".CodeMirror").hasClass('is-danger')) {
                $(".CodeMirror, .editor-toolbar").addClass('is-danger');
                $(".editor-preview-side").after('<span class="help is-danger">Preencha este campo.</span>')
            }
            valid = false;
        }

        let thereIsExample = false;
        for (let eg in eg_editors) {
            if (eg_editors[eg].i.getValue().trim()) {
                thereIsExample = true;
                formData.append("eg_i", eg_editors[eg].i.getValue().trim());
                formData.append("eg_o", eg_editors[eg].o.getValue().trim());
            }
        }
        if (thereIsExample) {
            if ($(".eg-container").hasClass('is-danger')) {
                $(".eg-container").removeClass('is-danger');
                $("span.add").next().remove();
            }
        } else {
            if (!$(".eg-container").hasClass('is-danger')) {
                $(".eg-container").addClass('is-danger');
                $("span.add").after('<span class="help is-danger" style="margin-top: 10px;">É obrigatório ter pelo menos um exemplo.</span>');
            }
            valid = false;
        }

        if (!valid) return false;

        $.ajax({
            url: "/api/new",
            type: "post",
            data: formData,
            cache: false,
            contentType: false,
            processData: false,
            success: function (res) {
                window.location = res.redirect;
            },
            error: function (e) {
                // console.log(e);
            }
        });
    });
});