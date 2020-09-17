const marked   = require('marked');
const renderer = new marked.Renderer();

renderer.heading = function (text, level) {
	if (level > 2) level = 2;
	level += 4;
	return `<h${level} class="subtitle is-${level}">${text}</h${level}>`;
}

module.exports = function (markdown) {
	return new Promise((resolve, reject) => {
		marked(markdown, {
			renderer: renderer
		}, (err, result) => {
			if (err) reject(err);
			else resolve(result);
		});
	});
}