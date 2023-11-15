import winston from "winston";
import toJson from "json-stringify-safe";
import {MESSAGE} from "triple-beam";

const {createLogger, format} = winston;

export {winston};
export {toJson};

export const removeUndefinedFormatter = format((info, opts) => {
	Object.entries(info).forEach(([key, value]) => {
		if (value == undefined) {
			delete info[key];
		}
	});
	return info;
});

export const loggerConsoleFormat = format(info => {
	const stringifiedRest = toJson(Object.assign({}, info, {
		level: undefined,
		message: undefined,
		splat: undefined,
		timestamp: undefined,
	}));

	const padding = info.padding && info.padding[info.level] || "";
	if (stringifiedRest !== "{}") {
		info[MESSAGE] = `[${info.timestamp}] ${info.level}:${padding} ${info.message} ${stringifiedRest}`;
	}
	else {
		info[MESSAGE] = `[${info.timestamp}] ${info.level}:${padding} ${info.message}`;
	}

	return info;
});

const toJSONString = (str) => ((typeof str === "string" && str.startsWith("\"") && str.endsWith("\"")) ? str : JSON.stringify(str || ""));
const escapeSensitiveString = (str) => toJSONString(str).replace(/("[^"]*?(pass|token|ticket).*?(?:"|\\")+\:(?:"|\\")+)(.*?)((?:"|\\")+[,}])/gi, "$1*****$4");
const fromJSONString = (str) => ((typeof str === "string" && str.startsWith("\"") && str.endsWith("\"")) ? JSON.parse(str) : str);

export const escapeSensitiveFormatter = format((info) => {
	Object.keys(info)
		.filter(key => key !== "message" && key !== "type").forEach(key => {
			if (["pass", "token", "ticket"].some($ => key.toLowerCase().includes($))) {
				info[key] = "*****";
			}
			else {
				info[key] = JSON.parse(escapeSensitiveString(info[key] || ""));
			}
		});

	if (info.message) {
		info.message = fromJSONString(escapeSensitiveString(info.message));
	}
	return info;
});

export async function initLoggerV1 ({$app, graylog} = {}) {
	const logger = createLogger({
		// format: format.json(),
		exitOnError: false,
		defaultMeta: {},
		format: format.combine(
			removeUndefinedFormatter(),
			format.errors({stack: true}),
			escapeSensitiveFormatter(),
			// format.metadata(),
		),
		level: "info",
		transports: [],
	});

	if (graylog?.address && graylog?.port) {
		console.log(`using graylog as logger`, {
			protocol: graylog?.proto,
			host: graylog?.address,
			port: graylog?.port,
		});

		const WinstonGelf = (await import("winston-gelf")).default;
		const transport = new WinstonGelf({
			handleExceptions: true,
			gelfPro: {
				adapterName: graylog?.proto,
				adapterOptions: {
					host: graylog?.address,
					port: graylog?.port,
				},
			},
		});

		transport.__name$ = "graylog";
		logger.add(transport);

		logger.defaultMeta["app-name"] = $app.name;
		logger.defaultMeta["app-version"] = $app.version;
	}
	else {
		const transport = new winston.transports.Console({
			handleExceptions: true,
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple(),
			),
		});

		transport.__name$ = "console";
		logger.add(transport);
	}

	logger.transports$ = {
		console: logger.transports.find(t => t.__name$ === "console"),
		graylog: logger.transports.find(t => t.__name$ === "graylog"),
	};

	if (logger.transports$.graylog) {
		logger.log({level: "info", message: `graylog - log level is: ${graylog.level}`});
		logger.transports$.graylog.level = graylog.level;
	}
	else {
		logger.log({level: "info", message: `graylog - cant find logger transport by name`});
	}

	if (logger.transports$.console) {
		logger.log({level: "info", message: `console - log level is: ${console.level}`});
		logger.transports$.console.level = console.level;
	}

	return logger;
}
