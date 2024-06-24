import { log } from "mathjs";

const durations = [];

/* function intakeManager(duration) {
    duration = duration + 1;

    const hours = new Date().getHours() + duration + ":00";
    const day = new Date().getDate();
    const month = new Date().getMonth() + 1;
    const finalDate = new Date('2024 ' + month + ' ' + day + ',' + hours);

    durations.push(finalDate);
    durations.push(new Date('2035 ' + month + ' ' + day + ',' + hours));

    console.log(durations[0]);
    const x = durations.splice(0, 1);

    console.log(hours);
    console.log(day);
    console.log(month);
    console.log(durations[0]);
} */

function setIntake(duration) {
    const dur = 2;
    /* const hours = new Date().getHours() + duration + ":00";
    const day = new Date().getDate();
    const month = new Date().getMonth() + 1;
    const finalDate = new Date('2024 ' + month + ' ' + day + ',' + hours); */
     const now = new Date();
     const newDate = new Date(now.getTime() + dur * 60 * 60 * 1000); // Hinzufügen von 2 Stunden
     const finalDate = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), newDate.getHours(), 0, 0);
 
    /* const hours = new Date().getHours() + dur;
    const day = new Date().getDate();
    const month = new Date().getMonth();
    const finalDate = new Date('2024' + month + day + hours); */

    durations.push(finalDate);
   /*  console.log(hours); */
  /*   console.log(day);
    console.log(month); */
    console.log(durations[0]);
}

function getNextIntake() {
    return durations.splice(0, 1);;
}

export { setIntake, getNextIntake }
export default durations;