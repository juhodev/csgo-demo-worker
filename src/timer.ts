class Timer {
	private timers: Map<string, number>;

	constructor() {
		this.timers = new Map();
	}

	start(name: string) {
		this.timers.set(name, new Date().getTime());
	}

	end(name: string): number {
		const start: number = this.timers.get(name);

		if (start === undefined) {
			return -1;
		}

		return new Date().getTime() - start;
	}
}

export default Timer;
