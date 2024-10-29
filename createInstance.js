import qs from 'querystring';
import axios from "axios";
import { log } from 'mathjs';

const resources = {
    intake: 4,
    surgery: 5,
    nurse_A: 30,
    nurse_B: 40,
    emDepartment: 9,
};

async function firstreplan(){
    const initData = { patientId: null, diagnosis: "A2", admissionTime: 0, setResources: true, recources: resources };
    const url = 'https://cpee.org/flow/start/url/';
    const data = {
        behavior: 'fork_running',
        url: 'https://cpee.org/hub/server/Teaching.dir/Prak.dir/Challengers.dir/Ahmad_Ha.dir/Main.xml',
        init: JSON.stringify(initData),
    };
    try {
        const response = await axios.post(url, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        console.log(i);
        console.log('Response:', response.data);
        console.log("--------------------------");
    } catch (error) {
        console.error('Error:', error);
    }
}

async function replan(req, res) {
    console.log("CreateInstance");
    /*     const patientId = req.body["patientId"]; */
    /*     const diagnosis = req.body['diagnosis']; */
    /*     patientArray[patientId].admissionTime = 0; */
    console.log("patientId " + null +
        " diagnosis " + "A2" +
        " admissionTime " + 0);


    const initData = { patientId: null, diagnosis: "A2", admissionTime: 0};
    const url = 'https://cpee.org/flow/start/url/';
    const data = {
        behavior: 'fork_running',
        url: 'https://cpee.org/hub/server/Teaching.dir/Prak.dir/Challengers.dir/Ahmad_Ha.dir/Main.xml',
        init: JSON.stringify(initData),
    };
    const formData = qs.stringify(data);
        
    for (let i = 0; i < 1; i++) {
        try {
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            console.log(i);
            console.log('Response:', response.data);
            console.log("--------------------------");
        } catch (error) {
            console.error('Error:', error);
        }
    };

}


replan();