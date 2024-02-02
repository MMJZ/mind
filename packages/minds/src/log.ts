import { createLogger, transports } from 'winston';

export function getLogger() {
	const logger = createLogger({
		transports: [new transports.Console()],
	});

	return logger;
}
