
import process from "node:process";
import childProcess from "node:child_process";

export function getParamsMap (cmd = "") {
	const quotes = `"'\``.split("");
	const map = {};
	let param = null;
	splitParams(cmd)
		.flatMap(l => l.split(/(=.+)/))
		.forEach(l => {
			if (!l.trim()) {
				return;
			}
			if (!param || l.startsWith("-")) {
				param = l.replace(/^-+/, "");
			}
			else {
				l = l.replace(/^=/, "");
				if (quotes.includes(l[0]) && l[0] === l[l.length - 1]) {
					l = l.substring(1, l.length - 1);
				}
				map[param] = map[param] || [];
				map[param].push(l);
				param = null;
			}
		});

	return map;
}

export function splitParams (cmd = "", splitBy = /\s+/) {
	const quotes = `"'\``.split("");
	let q;
	let start;
	let idx = 0;
	const params = [];
	let chars = Array.from(cmd);
	while (idx < chars.length) {
		const c = chars[idx];
		if (!q) {
			if (quotes.includes(c)) {
				q = c;
				start = idx;
			}
		}
		else {
			if (c === q) {
				q = null;
				const _start = chars.slice(0, start).reduce((res, c) => res += c.length, 0);
				const _end = chars.slice(0, idx + 1).reduce((res, c) => res += c.length, 0);
				params.push(cmd.substring(_start, _end));
				cmd = `${cmd.substring(0, _start)}~${params.length - 1}~${cmd.substring(_end)}`;
				chars = Array.from(cmd);
				idx = start;
				start = null;
			}
		}
		idx++;
	}

	return cmd.split(splitBy).map(i => i.replace(/\~(\d)\~/, (all, p1) => {
		return params[p1];
	}));
}

export function sh (cmd, options = {}) {
	const p = splitParams(cmd);
	const {stdin, stdout, stderr} = exec.getStdio();

	return new Promise((resolve, reject) => {
		const child = childProcess.spawn(p[0], p.slice(1), options);


		let result = "";

		if (child.stdout) {
			child.stdout.on("data", (data) => {
				result += data.toString();
			});
			if (!options.silent) {
				child.stdout.pipe(stdout);
			}
		}
		let resultErr = "";
		if (child.stderr) {
			child.stderr.on("data", (data) => {
				resultErr += data.toString();
			});
			if (!options.silent) {
				child.stderr.pipe(stderr);
			}
		}

		child.once("exit", (code) => {
			stdin.pause();

			let resultCombined = (result || "") + (resultErr || "");
			if (options.trim) {
				resultCombined = resultCombined.trim();
			}

			if (!code || options.ignoreExitCode) {
				resolve(resultCombined);
			}
			else {
				reject(resultCombined);
			}

		});

		child.once("error", (error) => {
			reject(error);
		});
	});
}

const exec = (cmd, options = {}) => {
	return sh(cmd, Object.assign({
		stdio: options.tty ? "inherit" : ["inherit", "pipe", "inherit"],
		shell: true,
		env: Object.assign({FORCE_COLOR: 1}, process.env),
	}, options));
};


exec.getStdio = () => {
	return {
		stdin: exec.stdin || process.stdin,
		stdout: exec.stdout || process.stdout,
		stderr: exec.stderr || process.stderr,
	};
};

exec.setStdio = (stdin, stdout, stderr) => {
	exec.stdin = stdin;
	exec.stdout = stdout;
	exec.stderr = stderr;
};


export default exec;
