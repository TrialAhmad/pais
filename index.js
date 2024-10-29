import express from "express";
import axios from "axios";
import qs from 'querystring'
import { Mutex } from "async-mutex";
import { Sema } from "async-sema";
import { log, norm } from 'mathjs';

//dependcies inside
import patient from "./patient.js";
import { timeConsumptionArray } from './timeConsumptionData.js';
import SystemState from "./systemState.js";
import AppointmentManager from './annealing.js';


/* ToDos:

    - simulated annealing   - extracting Fit-Value Function as stand alone function  
   
*/

const app = express();
const port = 12794;

//Erstellung eines Array für Customer Id + TestCustomer 
var patientArray = [];
patientArray.push(new patient(0, "true"));
var counterId = 1;

const sysState = new SystemState();
const timeFactor = 1000 /* * 60 * 60 */; 
const mutex = new Mutex();
var beforeNurSur = 0;
const appointmentManager = new AppointmentManager(); // Instanz des AppointmentManagers erstellen


const resources = {
    intake: 4,
    surgery: 5,
    nurse_A: 30,
    nurse_B: 40,
    emDepartment: 9,
};
const diagnosesProbability = {
    A: [{ diagnosis: 'A1', probability:0.5 },
        { diagnosis:'A2', probability:0.25 },
        { diagnosis:'A3', probability:0.125 },
        { diagnosis:'A4', probability:0.125 }],
    B: [{ diagnosis:'B1', probability: 0.5 },
        { diagnosis:'B2', probability:0.25 },
        { diagnosis:'B3', probability:0.125 },
        { diagnosis:'B4', probability:0.125 }]
};

const temperature = 1000;
const coolingRate = 0.95;
const maxIterations = 1000;

//Middleware
app.use((req, res, next) => {
    next(); 
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Middleware für JSON-Bodies

//
function checkPatientExists(checkedId) {
    console.log("Checking Patient ID: " + checkedId);
    if (checkedId === null || checkedId === undefined || checkedId === "") {
        console.log("Checked ID is null, undefined, or empty");
        return false;
    }
    return patientArray.find(patient => patient.patientId == checkedId) !== undefined;
}

function findDiagnosisData(diagnosis) {
    return timeConsumptionArray.find(tc => tc.diagnosis === diagnosis);
}

function getDiagnosis() {
    // Diagnose-Wahrscheinlichkeiten für die Patiententypen
    const patientType = Math.random() < 0.5 ? 'A' : 'B';

    // Zufallszahl 0 - 1
    let randomValue = Math.random();
    let cumulativeProbability = 0;
    // kumulierten Wahrscheinlichkeit
    for (let entry of diagnosesProbability[patientType]) {
        cumulativeProbability += entry.probability;
        if (randomValue < cumulativeProbability) {
            return entry.diagnosis;
        }
    }
}


// Erstellung einer neuen ID für Patient
function createId(em) {
    patientArray.push(new patient(counterId, em, 0));
}

function checkComplication(probability) {
    const randomValue = Math.random() * 1000;
    return (randomValue <= probability) == true;
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRecources(req, res) {
    console.log("Recource Report");
    res.send({
        "intake": resources.intake,
        "surgery": resources.surgery,
        "nurse_A": resources.nurse_A,
        "nurse_B": resources.nurse_B,
        "emDepartment": resources.emDepartment,
    });
};
async function getSystemState(req, res) { //tells where and which patient is currently
    console.log("SystemState Report");
    res.send({
        "systemState": sysState,
    });
};

app.post("/startHospital", async (req, res) => {
    const url = 'https://cpee.org/flow/start/url/';
    const data = {
        behavior: 'fork_ready',
        url: 'https://cpee.org/hub/server/Teaching.dir/Prak.dir/Challengers.dir/Ahmad_Ha.dir/Main.xml',
    };
    const formData = qs.stringify(data);
    try {
        const response = await axios.post(url, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        console.log('Response:', response.data);
        res.send({ "newInstanceCreated": true });
    } catch (error) {
        console.error('Error:', error);
        res.send({ "newInstanceCreated": false });
    }
});

app.post("/role", async (req, res) => {
    const role = req.body.role
    console.log("Role: " + role + "--------------");
    // Überprüfen, welcher Name empfangen wurde und entsprechende Funktion aufrufen
    if (role == 'admitPatient') {
        admitPatient(req, res);
    } else if (role == 'intake') {
        intake(req, res);
    } else if (role == 'emTreatment') {
        emTreatment(req, res);
    } else if (role == 'operation') {
        operation(req, res);
    } else if (role == 'nursing') {
        nursing(req, res);
    } else if (role == 'replan') {
        replan(req, res);
    } else if (role == 'release') {
        release(req, res);
    } else if (role == 'getRecources') {
        getRecources(req, res);
    } else if (role == 'getSystemState') {
        getSystemState(req, res);
    } else {
        res.status(404).send('Funktion nicht gefunden');
    }
});


async function release(req, res) {
    const patientId = req.body["patientId"];
    sysState.deleteOfSystemState("admitted", patientId);
    sysState.setSystemState("release", patientArray[patientId]);
    beforeNurSur--;
    res.send({ "released": true });
    console.log("Infront of Surg/Nurs Minus: " + beforeNurSur);
};

//---------Replan-----------------------------------------------------------------
async function replan(req, res) {
    console.log("CreateInstance");
    const patientId = req.body["patientId"];
    const diagnosis = req.body['diagnosis'];

    sysState.setSystemState("replan", patientArray[patientId]);
    const appointment = appointmentManager.simulatedAnnealing(0, temperature, coolingRate, maxIterations);
    console.log('Buchung erfolgreich:');
    console.log("patientId " + patientId +
        " diagnosis " + diagnosis + " nextAvailableTime ", appointment.startDate);

    sysState.setSystemState("appointment", appointmentManager.getAppointments());
    console.log("AllAppointments: ",  appointmentManager.getAppointments());
    

    const initData = { patientId: patientId, diagnosis: diagnosis, admissionTime: 0, nextAvailableTime: appointment.startDate };
    const url = 'https://cpee.org/flow/start/url/';
    const data = {
        behavior: 'fork_running',
        url: 'https://cpee.org/hub/server/Teaching.dir/Prak.dir/Challengers.dir/Ahmad_Ha.dir/Main.xml',
        init: JSON.stringify(initData),
    };
    const formData = qs.stringify(data);
    try {
        const response = await axios.post(url, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (patientArray[patientId].replanCounter >= 1) {
            patientArray[patientId].replanCounter = patientArray[patientId].replanCounter + 1;
        } else {
            patientArray[patientId].replanCounter = 1;
        }

        console.log('Response:', response.data);
        res.send({ "newInstanceCreated": true });
    } catch (error) {
        console.error('Error:', error);
        res.send({ "newInstanceCreated": false });
    }
};

//_________________End Replan__________________________________________________________

async function operation(req, res) {
    console.log("Operation " + req.body["patientId"] + " " + req.body['diagnosis']);
    const patientId = req.body["patientId"];
    const diagnosis = req.body['diagnosis'];
    const admissionTime = findDiagnosisData(diagnosis).timeOperation;
    const sema = new Sema(resources.surgery); //Nur die Anzahl der Resource kann gleichzeitig benutzt werde, der Rest muss warten

    if (checkPatientExists(patientId)) {
        if (!patientArray[patientId].admissionTime) {
            patientArray[patientId].admissionTime = 0;
        }
        await sema.acquire();

        sysState.setSystemState("surgery", patientArray[patientId]);
        console.log("Starting Operating ID: " + patientId + " Time " + admissionTime * timeFactor);
        await delay(admissionTime * timeFactor);
        patientArray[patientId].diagnosis = diagnosis;
        patientArray[patientId].admissionTime += admissionTime;
        sysState.deleteOfSystemState("surgery", patientId);
        console.log("Ending Operating" + "\n" + "------------------");
        res.send({ "admissionTime": patientArray[patientId].admissionTime });

        sema.release();
    } else {
        sema.release();
        res.status(404).send({ error: "Patient not found" });
    }
};

async function nursing(req, res) {
    console.log("Nursing ID " + req.body["patientId"] + " " + req.body['diagnosis']);
    const patientId = req.body["patientId"];
    const diagnosis = req.body['diagnosis'];
    const admissionTime = findDiagnosisData(diagnosis).timeNursing;
    const complication = checkComplication(findDiagnosisData(diagnosis).probability);
    const sema = new Sema(resources.nurse_A);
    sysState.deleteOfSystemState("afterIntake", patientId);

    if (checkPatientExists(patientId)) {
        if (!patientArray[patientId].admissionTime) {
            patientArray[patientId].admissionTime = 0;
        }

        await sema.acquire();
        sysState.setSystemState("nursing", patientArray[patientId]);
        console.log("Starting nursing ID: " + patientId + " Time " + admissionTime * timeFactor);
        await delay(admissionTime * timeFactor);
        patientArray[patientId].diagnosis = diagnosis;
        patientArray[patientId].admissionTime += admissionTime;
        sysState.deleteOfSystemState("nursing", patientId);
        if (complication) {
            sysState.setSystemState("afterIntake", patientArray[patientId]);
        }
        console.log("Ending nursing, Comlplication : " + complication + "\n" + "------------------");
        res.send({ "admissionTime": patientArray[patientId].admissionTime, "complication": complication });
        sema.release();

    } else {
        sema.release();
        res.status(404).send({ error: "Patient not found" });
    }
};

async function emTreatment(req, res) {
    console.log(req.body);

    const patientId = req.body["patientId"];
    const admissionTime = norm([2, 0.5]);
    const diagnosis = getDiagnosis();

    if (checkPatientExists(patientId)) {
        if (!patientArray[patientId].admissionTime) {
            patientArray[patientId].admissionTime = 0;
        }

        sysState.setSystemState("emTreatment", patientArray[patientId]);
        console.log("Starting EM-Treatment ID: " + patientId + " Time " + admissionTime * timeFactor);
        await delay(admissionTime * timeFactor);
        patientArray[patientId].admissionTime += admissionTime;
        sysState.deleteOfSystemState("emTreatment", patientId);
        console.log("Ending EM-Treatment" + "\n" + "------------------");

        res.send({ "admissionTime": patientArray[patientId].admissionTime, "diagnosis": diagnosis });
    } else {
        res.status(404).send({ error: "Patient not found" });
    }
    beforeNurSur++;
    console.log("Infront of Surg/Nurs PLUS " + beforeNurSur);
};

async function intake(req, res) {
    console.log(req.body);

    const patientId = req.body["patientId"];
    const admissionTime = norm([1, 0.125]);
    const diagnosis = getDiagnosis();

    if (checkPatientExists(patientId)) {
        if (!patientArray[patientId].admissionTime) {
            patientArray[patientId].admissionTime = 0;
        }
        sysState.setSystemState("intake", patientArray[patientId]);
        console.log("Starting Intake ID: " + patientId + " Time " + admissionTime * timeFactor);
        await delay(admissionTime * timeFactor);
        patientArray[patientId].admissionTime += admissionTime;
        sysState.deleteOfSystemState("intake", patientId);
        console.log("Ending Intake" + "\n" + "------------------");
        res.send({ "admissionTime": patientArray[patientId].admissionTime , "diagnosis": diagnosis});
    } else {
        res.status(404).send({ error: "Patient not found" });

    }
    resources.intake++;
    beforeNurSur++;
    console.log("Infront of Surg/Nurs PLUS " + beforeNurSur);
};


async function admitPatient(req, res) {
    const checkedId = req.body["patientId"];
    const em = req.body["em"];
    const appointment = new Date(req.body["nextAvailableTime"]);
    console.log(req.body);

    sysState.deleteOfSystemState("replan", checkedId)
    if (req.body.setReources) { // Optionales Feature für Generic Resourcen
        resources = req.body.resources;
        diagnosesProbability = req.body.diagnosesProbability;
        timeFactor = req.timeFactor;
        res.send(200);
    }
    else if (checkPatientExists(checkedId)) {
        if (em == "true") { //Has ID and Emergency goes to EM
            sysState.setSystemState("admitted", patientArray[checkedId])
            res.send({
                "patientId": checkedId, "getsTreatment": true,
                "admissionTime": patientArray[checkedId].admissionTime
            });
        } else { //Has ID and NO Em
            console.log("Appointment: ", appointment);
            
            console.log("Wait ", appointment - Date.now());
            console.log("Warten bis zum Termin...");
            await new Promise(resolve => setTimeout(resolve, Math.max(0, appointment - Date.now()))); //Warten bis Appointment zu trifft
            console.log("Termin erreicht, Vorgang wird fortgesetzt.");
            const release = await mutex.acquire(); //Max nur 1 Thread wegen counter and check

            console.log("resources.intake " + resources.intake);
            if (resources.intake > 0 && beforeNurSur <= 2) {//Has ID goes to Intake
                resources.intake--;
                release();
               
                console.log("Has ID & gets Treatment");
                sysState.setSystemState("admitted", patientArray[checkedId])
                res.send({
                    "patientId": checkedId,
                    "em": em, "getsTreatment": true,
                    "admissionTime": patientArray[checkedId].admissionTime
                });
            }
            else {//Goes Home
                release();
                console.log("Has ID & gets NO Treatment");
                res.send({ "patientId": checkedId, "getsTreatment": false });

                /*  res.send({ "patientId": checkedId, "em": em,  "admissionTime": 0 }); */
            }
        }

    } else if (em == "true") { // goes to EM
        //something
        console.log("BUT Emergency");
        createId("true");
        const tempPatient = patientArray[counterId++];
        sysState.setSystemState("admitted", tempPatient)
        res.send({ "patientId": tempPatient.patientId, "em": tempPatient.em, "getsTreatment": true, "admissionTime": tempPatient.admissionTime });
    } else {    //Goes home with new id
        console.log("Tomorrow");
        createId("false");
        const tempPatient = patientArray[counterId++];

        res.send({ "patientId": tempPatient.patientId, "em": tempPatient.em, "getsTreatment": false, "admissionTime": tempPatient.admissionTime });
    }
};

app.listen(port, '::', () => {
    console.log(`Server is running on http://0.0.0.0::${port}`);
    console.log("---------------------------------------------------------------------------------------------");
});
