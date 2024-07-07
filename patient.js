function patient (patientId, em, admissionTime, diagnosis, replanCounter) {
    this.patientId = patientId;
    this.em = em;
    this.admissionTime = admissionTime;
    this.diagnosis = diagnosis;
    this.replanCounter = replanCounter;
};

export default patient;
