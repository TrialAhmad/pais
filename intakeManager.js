import { log } from "mathjs";

const durations = [];
const appointments = [];

function setIntake(duration) {
    const dur = 4;

    const now = new Date();
    const fourHoursInMilliseconds = dur * 60 * 60 * 1000;
    const finalDate = new Date(now.getTime() + fourHoursInMilliseconds);
    console.log("Zeit in 4 Stunden: " + finalDate);

    durations.push(finalDate.toLocaleString());
    console.log("durations.length " + durations.length);
    console.log(finalDate.toLocaleString());
}

function getNextIntake() {
    
    let temp;
    if(durations.length < 4){
        temp = new Date().toLocaleString();
        
    }else{temp = durations[durations.length -  4];}
    console.log("Durations " + durations);
    console.log("GetNextIntake " + temp);
    appointments.push(temp);
    console.log(appointments);
    return temp;
}

export { setIntake, getNextIntake }
export default durations;