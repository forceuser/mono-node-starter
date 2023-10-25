import os from "node:os";
import process from "node:process";
import cluster from "node:cluster";
import {toJson} from "#logger/index.js";
import {toObject} from "#common/utils.js";
import {getVhost} from "#config/vhost-config.js";
import {IAMSessionGen} from "#svc/iam.js";

if (!("isPrimary" in cluster)) {
	Object.defineProperty(cluster, "isPrimary", {
		get () {
			return cluster.isMaster;
		},
	});
}

export async function startApp ($app) {
	if (typeof $app?.initApp !== "function") {
		throw new Error("$app must have initApp function");
	}

	const multi = $app.config.multiprocess;
	const cpuAmountMax = os.cpus().length;
	let cpuAmount;
	if (!multi) {
		cpuAmount = 0;
	}
	else if (multi < 0) {
		cpuAmount = cpuAmountMax + multi;
	}
	else if (multi > 0 && multi <= 1) {
		cpuAmount = Math.ceil(cpuAmountMax * multi);
	}
	else {
		cpuAmount = multi;
	}
	cpuAmount = Math.max(1, Math.min(cpuAmountMax, Math.round(cpuAmount)));

	if (cluster.isPrimary && cpuAmount > 1) {
		for (let i = 0; i < cpuAmount; i++) {
			cluster.fork(process.env);
		}

		cluster.on("fork", (worker) => {
			$app.logger.info(`${$app.name}@${$app.version} - subprocess(${worker.process.pid}) starting...`);
			worker.timestamp = Date.now();
		});

		cluster.on("exit", (worker, code, signal) => {
			$app.logger.log({level: "info", message: `${$app.name}@${$app.version} - subprocess(${worker.process.pid}) exited with code ${code}`});
			if (code !== 0 && Date.now() - worker.timestamp < 2000) {
				$app.logger.log({level: "info", message: `${$app.name}@${$app.version} - subprocess(${worker.process.pid}) exited too soon and will try to respawn after a minute`});
				setTimeout(() => {
					cluster.fork();
				}, 60_000);
			}
			else {
				cluster.fork();
			}
		});

		return $app;
	}
	else {
		return await startServer($app);
	}
}

export async function startServer ($app) {
	process.on("exit", () => {
		$app.logger.log({level: "info", message: `App: exit process pid: ${process?.pid}`});
	});

	process.on("uncaughtExceptionMonitor", (error, origin) => {
		try {
			$app.logger.log({level: "error", "message": `Uncaught exception!! error ${toJson(toObject(error))}, origin: ${origin}`});
		}
		catch {}
	});

	process.on("unhandledRejection", (reason, promise) => {
		try {
			$app.logger.log({level: "error", "message": `Unhandled rejection!! reason ${toJson(toObject(reason))}`});
		}
		catch {}
	});

	if ($app.config.vhost) {
		try {
			const vhost = getVhost();

			if (vhost) {
				$app.vhost = vhost;
				$app.config.port = $app.vhost?.proxyPort;
			}
		}
		catch {
			$app.logger.log({level: "warn", massage: "can't use autoconfigured vhost"});
		}
	}

	try {
		try {
			if ($app.config.cerberBaseUrl) {
				$app.iam = new IAMSessionGen({baseUrl: $app.config.cerberBaseUrl});
				if ($app.config.iamUserLogin && $app.config.iamUserPassword) {
					$app.iamSession = $app.iam.internal({
						auth: $app.config.iamAuthType || "EXCL",
						login: $app.config.iamUserLogin,
						password: $app.config.iamUserPassword,
					});
				}
			}

			await $app?.initApp?.($app); // createServer($app);
		}
		catch (error) {
			$app.health.error = "Server configuration error";
			$app.logger.log({level: "error", message: `error while configuring server: ${toJson(toObject(error))}`});
		}

		$app.fastify.route({
			url: "/health",
			method: ["HEAD", "GET"],
			handler: async (request, reply) => {
				reply.code($app.health.error ? 500 : 200)
					.headers({"content-type": "application/json"}).send(toJson($app.health));
			},
		});

		$app.fastify.route({
			url: "/health/liveness",
			method: ["HEAD", "GET"],
			handler: async (request, reply) => {
				reply.code($app.health.error ? 500 : 200)
					.headers({"content-type": "application/json"}).send(toJson($app.health));
			},
		});

		$app.fastify.route({
			url: "/health/readiness",
			method: ["HEAD", "GET"],
			handler: async (request, reply) => {
				reply.code($app.health.error ? 500 : 200)
					.headers({"content-type": "application/json"}).send(toJson($app.health));
			},
		});



		$app.fastify.listen({
			port: $app.config.port,
			host: $app.config.host,
		}, (error, address) => {
			if (error) {
				$app.health.error = "Http server error";
				$app.logger.log({level: "error", message: `error listening http server: ${toJson(toObject(error))}`});
			}
			else {
				$app.health.webServerActive = true;
			}
			if (cluster.isPrimary) {
				$app.logger.log({level: "info", message: `${$app.name}@${$app.version} - server listening on ${address}${$app.baseUrl}`});
				if ($app.vhost) {
					$app.logger.log({level: "info", message: `virtual host: https://${$app.vhost.domainName}${$app.baseUrl}`});
				}
			}
			else {
				$app.logger.log({level: "info", message: `${$app.name}@${$app.version} - subprocess(${process.pid}) of server(${process.ppid}) listening on ${address}${$app.baseUrl}`});
			}
		});
	}
	catch (error) {
		$app.health.error = "Init server error";
		$app.logger.log({level: "error", message: `error while initializing fastify server: ${toJson(toObject(error))}`});
	}
	return $app;
}
