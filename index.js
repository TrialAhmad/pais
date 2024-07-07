import express from "express";
import axios from "axios";
import qs from 'querystring'
import { Mutex } from "async-mutex";
import { Sema } from "async-sema";
import { norm } from 'mathjs';

//dependcies inside
import patient from "./patient.js";
import durations, { setIntake, getNextIntake } from "./intakeManager.js";
import { timeConsumptionArray } from './timeConsumptionData.js';
import SystemState from "./systemState.js";


/* ToDos:
    - Genric/Outsource getsTreatment to the cpee
    - 
    - Generic timeConsumptionData 

    - System State (Which Patient at which task or at queue) (alle roles abchecken)
    - if patient with an ID and Date then wait till Date(time) occurs ??
   
    - simulated annealing   - extracting Fit-Value Function as stand alone function  
    - diagnosis of Emergency Patient only known after EM-Treatment (what happens when it's empty?) 
    
*/

const app = express();
const port = 12792;

//Erstellung eines Array für Customer Id + TestCustomer 
var patientArray = [];
patientArray.push(new patient(0, "true"));
var counterId = 1;

const sysState = new SystemState();
const timeFactor = /* 60 * 60 * */ 1000;
const mutex = new Mutex();
var beforeNurSur = 0;

const resources = {
    intake: 4,
    surgery: 5,
    nurse_A: 30,
    nurse_B: 40,
    emDepartment: 9,
};

//Middleware
app.use((req, res, next) => {
    /*     console.log(`Anfrage empfangen: ${req.method} ${req.url}`); */
    next(); // Weiter zur nächsten Middleware 
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

// Erstellung einer neuen ID für Patient
function createId(em) {
    patientArray.push(new patient(counterId, em, 0));
    /* console.log("IdCounter: " + counterId); */
}

function checkComplication(probability) {
    const randomValue = Math.random() * 1000;
    /* console.log("Probability " + probability + " || RandomValue " + randomValue); */
    return (randomValue <= probability) == true;
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getReport(req, res) {
    console.log("Recource Report");
    res.send({
        "intake": resources.intake,
        "surgery": resources.surgery,
        "nurse_A": resources.nurse_A,
        "nurse_B": resources.nurse_B,
        "emDepartment": resources.emDepartment,
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
    } else if (role == 'getReport') {
        getReport(req, res);
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
    const nextIntake = getNextIntake();
    /* patientArray[patientId].admissionTime = 0; */

    console.log("patientId " + patientId +
        " diagnosis " + diagnosis + " nextAvailableTime " + nextIntake);
    /*  console.log(" admissionTime " + patientArray[patientId].admissionTime); */

    const initData = { patientId: patientId, diagnosis: diagnosis, admissionTime: 0, nextAvailableTime: nextIntake };
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
        }else{
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
    const sema = new Sema(resources.surgery);

    if (checkPatientExists(patientId)) {
        if (!patientArray[patientId].admissionTime) {
            patientArray[patientId].admissionTime = 0;
        }
        await sema.acquire();
        console.log("Starting Operating ID: " + patientId + " Time " + admissionTime * timeFactor);
        await delay(admissionTime * timeFactor);
        patientArray[patientId].diagnosis = diagnosis;
        patientArray[patientId].admissionTime += admissionTime;
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

    if (checkPatientExists(patientId)) {
        if (!patientArray[patientId].admissionTime) {
            patientArray[patientId].admissionTime = 0;
        }
        await sema.acquire();
        console.log("Starting nursing ID: " + patientId + " Time " + admissionTime * timeFactor);
        await delay(admissionTime * timeFactor);
        patientArray[patientId].diagnosis = diagnosis;
        patientArray[patientId].admissionTime += admissionTime;
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

    if (checkPatientExists(patientId)) {
        if (!patientArray[patientId].admissionTime) {
            patientArray[patientId].admissionTime = 0;
        }
        console.log("Starting EM-Treatment ID: " + patientId + " Time " + admissionTime * timeFactor);
        await delay(admissionTime * timeFactor);
        patientArray[patientId].admissionTime += admissionTime;
        console.log("Ending EM-Treatment" + "\n" + "------------------");
        res.send({ "admissionTime": patientArray[patientId].admissionTime });
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

    if (checkPatientExists(patientId)) {
        if (!patientArray[patientId].admissionTime) {
            patientArray[patientId].admissionTime = 0;
        }
        console.log("Starting Intake ID: " + patientId + " Time " + admissionTime * timeFactor);
        await delay(admissionTime * timeFactor);
        patientArray[patientId].admissionTime += admissionTime;
        console.log("Ending Intake" + "\n" + "------------------");
        res.send({ "admissionTime": patientArray[patientId].admissionTime });
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
    console.log(req.body);

    if (req.body.setReources) {
        resources = req.body.resources
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
        } else {
            const release = await mutex.acquire(); //Max nur 1 Thread wegen counter and check

            console.log("resources.intake " + resources.intake);
            if (resources.intake > 0 && beforeNurSur <= 2) {//Has ID goes to Intake
                resources.intake--;
                release();
                setIntake(norm([1, 0.125]) * timeFactor);

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
        /*  res.send(url, data= {"behavior": "fork_running", "url": "xml url", "init": {"getsTreatment": false }}) */

    }
};

app.listen(port, '::', () => {
    console.log(`Server is running on http://0.0.0.0::${port}`);
    console.log("---------------------------------------------------------------------------------------------");
});
