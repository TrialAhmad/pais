const appointments = [];

class appointmentManager {

    overlapedBy(newStart, newEnd) {
        let totalOverlap = 1;

        appointments.forEach(appointment => {
            // späteren Startzeitpunkt
            const startOverlap = new Date(Math.max(newStart, appointment.startTime));
            // früheren Endzeitpunkt
            const endOverlap = new Date(Math.min(newEnd, appointment.endTime));
            // Überschneidung in Millisekunden
            const overlap = endOverlap - startOverlap;

            // Wenn es eine positive Überschneidung gibt, zu Gesamtdauer addieren 
            if (overlap > 0) {
                totalOverlap += overlap / (1000 * 60 * 60); // Konvertieren in Stunden
            }
        });

        return totalOverlap;
    }

    isOverlaped(startTime, endTime) {
        return !appointments.some(
            booking => (startTime < booking.endTime && endTime > booking.startTime)
        );
    }

    getAppointments(){
        return appointments;
    }

    bookAppointment(startTime, endTime) {
        appointments.push({ startTime, endTime });
    }

    simulatedAnnealing(patient, temperature, coolingRate, maxIterations) {
        let currentSolution = this.generateRandomSolution(); 
        let bestSolution = currentSolution;
        let currentTemp = temperature;
        const minTemperature = 0.001;

        for (let i = 0; i < maxIterations && currentTemp > minTemperature; i++) {
            const newSolution = this.generateNeighborSolution(currentSolution);
            const currentCost = this.calculateCost(currentSolution); 
            const newCost = this.calculateCost(newSolution); 

            //console.log("newCost: ", newCost, " currentCost ", currentCost );
            if (newCost < currentCost || Math.exp((currentCost - newCost) / currentTemp) > Math.random()) {
                currentSolution = newSolution;
            }

            if (this.calculateCost(currentSolution) < this.calculateCost(bestSolution)) {
                bestSolution = currentSolution;
            }

            currentTemp *= coolingRate;
        }

        // Buchung des besten gefundenen Termins
        this.bookAppointment(bestSolution.startDate, bestSolution.endDate); 
        return bestSolution;
    }

    calculateCost(solution) {
        const { startDate, endDate } = solution;        
        const overlapWeight = this.overlapedBy(startDate, endDate); 

        let fitValue = overlapWeight * 10; // Je mehr Überschneidung, desto höher die Kosten

        const appointmentHour = startDate.getHours();
        if (appointmentHour < 9 || appointmentHour > 17) { //9 weil er aufrundet
            fitValue *= 10; // Bestrafung für unübliche Zeiten
        }
        return fitValue;
    }

    generateRandomSolution() {
        const now = new Date();
        const randomDays = Math.floor(Math.random() * 3 + 1); // 3 Tage (ab morgen)
        const randomHours = Math.floor(Math.random() * 7 + 9); // 9 Stunden (von 8 bis 17 Uhr)
        const randomMinutes = Math.floor(Math.random() * 60); // 60 Minuten

        const randomStartDate = new Date(now);
        randomStartDate.setDate(now.getDate() + randomDays);
        randomStartDate.setHours(randomHours);
        randomStartDate.setMinutes(randomMinutes);

        const averageDurationHours = 5; // durchschnittlicher Termin geschätzt 5 Stunden
        const randomEndDate = new Date(randomStartDate);
        randomEndDate.setHours(randomStartDate.getHours() + averageDurationHours);

        return { startDate: randomStartDate, endDate: randomEndDate};
    }

    generateNeighborSolution(currentSolution) {
        let neighborSolutionStart, neighborSolutionEnd;
        do {
            neighborSolutionStart = new Date(currentSolution.startDate);
            const randomChange = (Math.random() - 0.5) * 2 * 3 * 60 * 60 * 1000; // +/- 3 Stunden
            neighborSolutionStart.setTime(neighborSolutionStart.getTime() + randomChange);
    
            const averageDurationHours = 5;
            neighborSolutionEnd = new Date(neighborSolutionStart);
            neighborSolutionEnd.setHours(neighborSolutionStart.getHours() + averageDurationHours);
    
        } while (
            neighborSolutionStart.getHours() < 8 || 
            neighborSolutionEnd.getHours() > 17
        ); // Wiederhole, wenn Termin außerhalb des Zeitrahmens liegt

        return { startDate: neighborSolutionStart, endDate: neighborSolutionEnd };
    }
}

export default appointmentManager;
