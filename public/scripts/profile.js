window.addEventListener("load", () => {
	$(".tabs li").click(function () {
		$(".tabs li").removeClass('is-active');
		$(this).addClass('is-active');
	});
});

function makeCharts(submissions, languages) {
    AmCharts.makeChart("submissions", {
		"type": "serial",
		"categoryField": 0,
		"startDuration": 1,
        "precision": 0,
		"decimalSeparator": ",",
        "thousandsSeparator": ".",
		"handDrawn": true,
        "handDrawScatter": 1,
		"categoryAxis": {
			"autoWrap": true,
            "gridPosition": "start"
		},
		"graphs": [
			{
				"fillAlphas": 1,
				"fillColors": "#00D1B2",
				"lineColor": "#000000",
				"title": "Iniciante",
				"type": "column",
				"valueField": 1
			},
			{
				"fillAlphas": 1,
				"fillColors": "#23D160",
				"lineColor": "#000000",
				"title": "Fácil",
				"type": "column",
				"valueField": 2
			},
			{
				"fillAlphas": 1,
				"fillColors": "#FFDD57",
				"lineColor": "#000000",
				"title": "Intermédio",
				"type": "column",
				"valueField": 3
			},
			{
				"fillAlphas": 1,
				"fillColors": "#FF3860",
				"lineColor": "#000000",
				"title": "Difícil",
				"type": "column",
				"valueField": 4
			},
			{
				"fillAlphas": 1,
				"fillColors": "#000000",
				"lineColor": "#000000",
				"title": "Impossível",
				"type": "column",
				"valueField": 5
			}
		],
		"legend": {
			"enabled": true,
			"useGraphSettings": true
		},
		"dataProvider": submissions
	});

	AmCharts.makeChart('languages', {
        "type": "serial",
		"categoryField": 0,
		"startDuration": 1,
        "precision": 0,
		"decimalSeparator": ",",
        "thousandsSeparator": ".",
		"handDrawn": true,
        "handDrawScatter": 1,
		"categoryAxis": {
			"autoWrap": true,
            "gridPosition": "start"
		},
		"graphs": [
			{
				"fillAlphas": 1,
				"fillColors": "#00D1B2",
				"lineColor": "#000000",
				"title": "Iniciante",
				"type": "column",
				"valueField": 1
			},
			{
				"fillAlphas": 1,
				"fillColors": "#23D160",
				"lineColor": "#000000",
				"title": "Fácil",
				"type": "column",
				"valueField": 2
			},
			{
				"fillAlphas": 1,
				"fillColors": "#FFDD57",
				"lineColor": "#000000",
				"title": "Intermédio",
				"type": "column",
				"valueField": 3
			},
			{
				"fillAlphas": 1,
				"fillColors": "#FF3860",
				"lineColor": "#000000",
				"title": "Difícil",
				"type": "column",
				"valueField": 4
			},
			{
				"fillAlphas": 1,
				"fillColors": "#000000",
				"lineColor": "#000000",
				"title": "Impossível",
				"type": "column",
				"valueField": 5
			}
		],
		"legend": {
			"enabled": true,
			"useGraphSettings": true
		},
		"dataProvider": languages
	});
}