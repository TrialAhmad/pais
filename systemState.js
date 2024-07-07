class SystemState {
    constructor() {
        this.admitted = [];
        this.replan = [];
        this.intake = [];
        this.emTreatment = [];
        this.surgery = [];
        this.nursing = [];
        this.release = [];
    }

    setSystemState(role, patient) {
        if (this.hasOwnProperty(role)) {
            this[role].push(patient);
            console.log(`Patient mit ID ${patient.patientId} wurde zu ${role} hinzugefügt.`);
        } else {
            console.error(`Rolle ${role} existiert nicht.`);
        }
    }

    deleteOfSystemState(role, patientId) {
        if (this.hasOwnProperty(role)) {
            console.log(this[role]);
            const index = this[role].findIndex(patient => patient.patientId == patientId);
            if (index !== -1) {
                this[role].splice(index, 1);
                console.log(`Patient mit ID ${patientId} wurde von ${role} entfernt.`);
            } else {
                console.error(`Patient mit ID ${patientId} wurde in ${role} nicht gefunden.`);
            }
        } else {
            console.error(`Rolle ${role} existiert nicht.`);
        }
    }
}

export default SystemState;
