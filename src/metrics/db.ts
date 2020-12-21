import { Sequelize, Model, DataTypes } from 'sequelize';
import { logger } from '..';
const sequelize: Sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: 'data/db.sqlite',
});

type ProcessTimeAttributes = {
	logTime: number;
	processingTime: number;
	demo: string;
};

class ProcessTime
	extends Model<ProcessTimeAttributes, ProcessTimeAttributes>
	implements ProcessTimeAttributes {
	public logTime: number;
	public processingTime: number;
	public demo: string;

	public readonly createdAt!: Date;
	public readonly updatedAt!: Date;
}
ProcessTime.init(
	{
		logTime: DataTypes.NUMBER,
		processingTime: DataTypes.NUMBER,
		demo: DataTypes.STRING,
	},
	{ sequelize, modelName: 'ProcessTime' },
);

async function saveProcessTime(
	logTime: number,
	processingTime: number,
	demo: string,
) {
	logger.debug(`${logTime}, ${processingTime}, ${demo}`);
	await ProcessTime.sync();
	await ProcessTime.create({
		demo,
		logTime,
		processingTime,
	});
}

export { saveProcessTime, ProcessTime };
