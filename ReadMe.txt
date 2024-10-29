Zum starten des Server muss man "node index.js" im Terminal eingebegen. Durch "node creatInstance.js" kann man es testen.

Framework und Bibliotheken: Der Server ist in Node.js mit Express aufgebaut. 
Er nutzt unter anderem axios für HTTP-Anfragen, async-mutex und async-sema für asynchrone Ressourcensteuerung und einige Module wie mathjs für mathematische Berechnungen.

Kernfunktionen: Der Server simuliert einen Krankenhausablauf, bei dem Patienten bestimmte Behandlungen in einer bestimmten Reihenfolge durchlaufen. 
Die Verteilung der Diagnosen und die Ressourcen (z.B. Anzahl der Pflegekräfte) werden dynamisch verwaltet.

Systemzustand und Ressourcen: Der SystemState verwaltet, wo sich Patienten im System befinden. 
Die Ressourcen (resources) geben an, wie viele Einheiten jeder Ressource verfügbar sind.

Zu beginn checkt der Server welche Rolle (z.B. intake, emTreatment) und die zugehörige Funktion aufgrufen wird. 
AdmitPatient checkt, ob der Patient eine ID hat oder ein Emergency hat.
Treffen die Konditionen ein, wie keine ID und kein Emergency, oder kein Platz im intake oder zu viele im Nursing bereich, so wird der Patient neu geplant.

Diagnosen und Wahrscheinlichkeiten: Diagnosen werden mit bestimmten Wahrscheinlichkeiten generiert und basieren auf vordefinierten Datensätzen (diagnosesProbability).
Durch timeConsumptionData.js wird die Dauer der jeweilige Rolle ermittelt.

Simulated Annealing für Terminplanung: Der AppointmentManager enthält eine Methode, die simulated annealing verwendet, 
um optimale Termine für Behandlungen zu finden und Überlappungen zu minimieren.
           1. Initialisierung:
           
            Sucht eine zufällige Anfangslösung.
            Setze die anfängliche Temperatur auf einen hohen Wert

           2. Iterationen:
            Wiederhole für eine bestimmte Anzahl von Iterationen oder bis die Temperatur auf einen Minimalwert gesunken ist.
                a. Nachbarschaftssuche:
                Erzeuge eine neue Lösung in der Nachbarschaft der aktuellen Lösung 
​                b. Berechnung der Kosten (Energie):
                Berechne die Kostenfunktion für die aktuelle Lösung und die neue Lösung 
                c. Akzeptanzkriterium:
                Berechne die Differenz der Kosten
                Wenn Δ𝐸<0, akzeptiere die neue Lösung (da sie eine bessere Lösung darstellt).
                Wenn Δ𝐸≥0, akzeptiere die neue Lösung mit einer Wahrscheinlichkeit 𝑃=exp⁡(−Δ𝐸/𝑇)
                d. Aktualisierung der Temperatur:
                Senke die Temperatur gemäß einer Abkühlungsfunktion
                
            3 Abbruchkriterium:
            Beende den Algorithmus, wenn die Temperatur auf einen vorgegebenen Minimalwert gesunken ist 
            oder die maximale Anzahl an Iterationen erreicht ist.
