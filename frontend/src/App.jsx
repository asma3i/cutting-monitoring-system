import { useState,useEffect } from "react";
import "./App.css";

const API_URL = "http://10.115.38.66:3000";

function App() {
  const [machine, setMachine] = useState("LASER");
  const [jobNumber, setJobNumber] = useState("");
  const [operator, setOperator] = useState("");

  const [operationId, setOperationId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [operations, setOperations] = useState([]);

  // Live timer
  useEffect(() => {
    let timer;

    if (startTime) {
      timer = setInterval(() => {
        const now = new Date();
        const start = new Date(startTime);

        const seconds = Math.floor((now - start) / 1000);

        setElapsedTime(seconds);
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [startTime]);

  // Format seconds as HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);

    const minutes = Math.floor((seconds % 3600) / 60);

    const secs = seconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  // Start operation
  const startOperation = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/operations/start`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            machine,
            job_number: jobNumber,
            operator,
          }),
        }
      );

      const data = await response.json();

      setOperationId(data.operationId);
      setStartTime(data.startTime);
      setElapsedTime(0);
    } catch (error) {
      console.error("Error starting operation:", error);

      alert("Cannot connect to the backend server.");
    }
  };

  // Stop operation
  const stopOperation = async () => {
    try {
      await fetch(
        `${API_URL}/api/operations/stop/${operationId}`,
        {
          method: "POST",
        }
      );

      setOperationId(null);
      setStartTime(null);
      setElapsedTime(0);

      loadOperations();
    } catch (error) {
      console.error("Error stopping operation:", error);
    }
  };

  // Load operation history
  const loadOperations = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/operations`
      );

      const data = await response.json();

      setOperations(data);
    } catch (error) {
      console.error("Error loading operations:", error);
    }
  };

  // Load history when application starts
  useEffect(() => {
    loadOperations();
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Cutting Monitoring System</h1>

        <p>OXY • LASER • PLASMA</p>
      </header>

      <main>
        <section className="card">
          <h2>New Cutting Operation</h2>

          <label>Machine</label>

          <select
            value={machine}
            onChange={(e) => setMachine(e.target.value)}
            disabled={operationId !== null}
          >
            <option value="OXY">OXY</option>

            <option value="LASER">LASER</option>

            <option value="PLASMA">PLASMA</option>
          </select>

          <label>Job Number</label>

          <input
            type="text"
            placeholder="Example: JOB-001"
            value={jobNumber}
            onChange={(e) => setJobNumber(e.target.value)}
            disabled={operationId !== null}
          />

          <label>Operator</label>

          <input
            type="text"
            placeholder="Operator name"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            disabled={operationId !== null}
          />

          {!operationId ? (
            <button
              className="start-button"
              onClick={startOperation}
            >
              ▶ START OPERATION
            </button>
          ) : (
            <button
              className="stop-button"
              onClick={stopOperation}
            >
              ⏹ STOP OPERATION
            </button>
          )}
        </section>

        <section className="timer-card">
          <h2>Current Operation</h2>

          {operationId ? (
            <>
              <h3>{machine}</h3>

              <div className="timer">
                {formatTime(elapsedTime)}
              </div>

              <p>Operation in progress</p>
            </>
          ) : (
            <p>No operation currently running</p>
          )}
        </section>

        <section className="history">
          <h2>Operation History</h2>

          <table>
            <thead>
              <tr>
                <th>Machine</th>

                <th>Job</th>

                <th>Operator</th>

                <th>Duration</th>

                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {operations.map((operation) => (
                <tr key={operation.id}>
                  <td>{operation.machine}</td>

                  <td>{operation.job_number}</td>

                  <td>{operation.operator}</td>

                  <td>
                    {operation.duration
                      ? formatTime(operation.duration)
                      : "-"}
                  </td>

                  <td>{operation.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

export default App;
