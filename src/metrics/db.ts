import { Sequelize, Model, DataTypes } from 'sequelize';
const sequelize: Sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: 'data/db.sqlite',
});

class ProcessTime extends Model {}
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
	processTime: number,
	demo: string,
) {
	await ProcessTime.sync();
	await ProcessTime.create({
		logTime,
		processTime,
		demo,
	});
}

export { saveProcessTime };
