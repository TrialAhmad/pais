import { norm } from 'mathjs';

function timeConsumption(diagnosis, xO, yO, xN, yN, probability) {
    this.diagnosis = diagnosis;
    this.timeOperation = norm([xO, yO]);
    this.timeNursing = norm([xN, yN]);
    this.probability = probability; //auf 1000
}

const timeEA1 = new timeConsumption("A1", 0, 0, 4, 0.5, 10);
const timeEA2 = new timeConsumption("A2", 1, 0.25, 8, 2, 10);
const timeEA3 = new timeConsumption("A3", 2, 0.5, 16, 2, 20);
const timeEA4 = new timeConsumption("A4", 4, 0.5, 16, 2, 20);

const timeEB1 = new timeConsumption("B1", 0, 0, 8, 2, 1);
const timeEB2 = new timeConsumption("B2", 0, 0, 16, 2, 10);
const timeEB3 = new timeConsumption("B3", 4, 0.25, 16, 4, 20);
const timeEB4 = new timeConsumption("B4", 4, 1, 16, 4, 20);

const timeConsumptionArray = [timeEA1, timeEA2, timeEA3, timeEA4, timeEB1, timeEB2, timeEB3, timeEB4];

export { timeConsumptionArray };
