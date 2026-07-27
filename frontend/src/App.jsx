import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "";

function App() {
  const [machine, setMachine] = useState("LASER");
  const [operatorName, setOperatorName] = useState("");
  const [originMatiere, setOriginMatiere] = useState("CLIENT");
  const [materialType, setMaterialType] = useState("");
  const [thickness, setThickness] = useState("");
  const [dimension, setDimension] = useState("");
  const [quantity, setQuantity] = useState("");
  const [weight, setWeight] = useState("");
  const [carreUtile, setCarreUtile] = useState("");
  const [programme, setProgramme] = useState("");
  const [materialTypeOther, setMaterialTypeOther] = useState("");
  const [nombreToles, setNombreToles] = useState("");

  const [operationId, setOperationId] = useState(null);
  const [currentOperation, setCurrentOperation] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [operations, setOperations] = useState([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  // Operator manual entry (separate block)
  const [operatorManualMachine, setOperatorManualMachine] = useState("LASER");
  const [operatorManualName, setOperatorManualName] = useState("");
  const [operatorManualOrigin, setOperatorManualOrigin] = useState("CLIENT");
  const [operatorManualMaterial, setOperatorManualMaterial] = useState("");
  const [operatorManualThickness, setOperatorManualThickness] = useState("");
  const [operatorManualDimension, setOperatorManualDimension] = useState("");
  const [operatorManualQuantity, setOperatorManualQuantity] = useState("");
  const [operatorManualWeight, setOperatorManualWeight] = useState("");
  const [operatorManualCarreUtile, setOperatorManualCarreUtile] = useState("");
  const [operatorManualProgramme, setOperatorManualProgramme] = useState("");
  const [operatorManualMaterialTypeOther, setOperatorManualMaterialTypeOther] = useState("");
  const [operatorManualNombreToles, setOperatorManualNombreToles] = useState("");
  const [operatorManualStart, setOperatorManualStart] = useState("");
  const [operatorManualEnd, setOperatorManualEnd] = useState("");
  const [operatorManualError, setOperatorManualError] = useState("");
  const [currentSection, setCurrentSection] = useState("operation");
  const [adminUser, setAdminUser] = useState(null);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");

  const totalOperations = operations.length;
  const runningOperations = operations.filter(
    (operation) => operation.status === "RUNNING"
  ).length;
  const completedOperations = operations.filter(
    (operation) => operation.status === "COMPLETED"
  ).length;


  const loginAdmin = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAdminError(data.error || "Invalid credentials");
        return;
      }

      setAdminUser(data.username);
      setAdminError("");
      setAdminPassword("");
    } catch (error) {
      setAdminError("Unable to connect to the backend.");
    }
  };

  const logoutAdmin = () => {
    setAdminUser(null);
    setAdminUsername("");
    setAdminPassword("");
    setAdminError("");
  };

  const totalWeight = operations.reduce((sum, op) => sum + (parseFloat(op.weight) || 0), 0);

  const machineStats = operations.reduce((acc, op) => {
    if (!acc[op.machine]) acc[op.machine] = { hours: 0, count: 0 };
    acc[op.machine].count++;
    if (op.duration != null) acc[op.machine].hours += op.duration / 3600;
    return acc;
  }, {});

  const machineRows = Object.entries(machineStats).map(([machine, stats]) =>
    `<tr><td>${machine}</td><td>${stats.count}</td><td>${stats.hours.toFixed(2)} h</td></tr>`
  ).join("");

  const exportPdf = () => {
    if (!operations || operations.length === 0) {
      alert("Aucun historique à exporter.");
      return;
    }

    const rows = operations
      .map((operation) => {
        const statusLabel = operation.status === "RUNNING" ? "En cours" : "Terminé";
        const statusClass = operation.status === "RUNNING" ? "status-running" : "status-completed";

        return `
          <tr>
            <td>${operation.machine}</td>
            <td>${operation.programme || "-"}</td>
            <td>${operation.operator || "-"}</td>
            <td>${operation.bl_number || operation.job_number || "-"}</td>
            <td>${operation.client || "-"}</td>
            <td>${operation.origin_matiere || "-"}</td>
            <td>${operation.material_type || "-"}</td>
            <td>${operation.thickness || "-"}</td>
            <td>${operation.dimension || "-"}</td>
            <td>${operation.quantity || "-"}</td>
            <td>${operation.weight || "-"}</td>
            <td>${operation.nombre_toles || "-"}</td>
            <td>${operation.carre_utile || "-"}</td>
            <td>${formatTimestamp(operation.start_time)}</td>
            <td>${formatTimestamp(operation.end_time)}</td>
            <td>${operation.duration != null ? formatTime(operation.duration) : "-"}</td>
            <td><span class="status-dot ${statusClass}"></span>${statusLabel}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Bon de préparation</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
            h2 { margin-bottom: 8px; }
            h3 { margin: 16px 0 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
            th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
            th { background: #f2f2f2; }
            tr:nth-child(even) { background: #fafafa; }
            .status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; vertical-align: middle; }
            .status-running { background: #23b14d; }
            .status-completed { background: #d32f2f; }
            .summary-table { width: auto; min-width: 300px; margin: 12px 0; }
            .summary-table td { padding: 6px 16px; }
          </style>
        </head>
        <body>
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">
            <img src="/logo.svg" alt="Logo" style="width:100px;height:auto;object-fit:contain;border-radius:8px;" />
            <div>
              <h2 style="margin:0 0 2px 0">Bon de préparation</h2>
              <div style="color:#555;font-size:0.9rem;">Cutting Monitoring System</div>
            </div>
          </div>

          <table class="summary-table">
            <tr><td><strong>Total des opérations:</strong></td><td>${operations.length}</td></tr>
            <tr><td><strong>Poids total:</strong></td><td>${totalWeight.toFixed(2)} kg</td></tr>
          </table>

          <h3>Heures par machine</h3>
          <table class="summary-table">
            <thead>
              <tr><th>Machine</th><th>Opérations</th><th>Total heures</th></tr>
            </thead>
            <tbody>
              ${machineRows}
            </tbody>
          </table>

          <h3>Détail des opérations</h3>
          <table>
            <thead>
              <tr>
                <th>Machine</th>
                <th>Prog.</th>
                <th>Opérateur</th>
                <th>Origine</th>
                <th>Matériau</th>
                <th>Épaisseur</th>
                <th>Dimension</th>
                <th>Qté</th>
                <th>Poids</th>
                <th>Nb tôles</th>
                <th>Carré utile</th>
                <th>Début</th>
                <th>Fin</th>
                <th>Durée</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 100);
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      alert("Please allow popups to export PDF.");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const deleteHistory = async () => {
    if (!confirm('Delete all operation history? This cannot be undone.')) return;
    try {
      const resp = await fetch(`${API_URL}/api/operations`, { method: 'DELETE' });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to delete history');
      alert('Operation history deleted');
      loadOperations();
    } catch (err) {
      console.error('Delete history failed', err);
      alert(err.message || 'Failed to delete history');
    }
  };

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

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    return date.toLocaleString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  // Start operation (regular flow)
  const startOperation = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const response = await fetch(`${API_URL}/api/operations/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
        machine,
        operator: operatorName,
        origin_matiere: originMatiere,
        material_type: materialType === "AUTRE" ? materialTypeOther : materialType,
        thickness: thickness,
        dimension: dimension,
        quantity: quantity,
        weight: weight,
        carre_utile: carreUtile,
        programme: programme,
        nombre_toles: nombreToles,
      }),
      });

      const data = await response.json();

      if (response.status === 409) {
        // Machine busy — show message but don't crash
        alert(data.error || "Machine is busy");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to start operation");
      }

      const runningOperation = {
        id: data.operationId,
        machine,
        operator: operatorName,
        origin_matiere: originMatiere,
        material_type: materialType === "AUTRE" ? materialTypeOther : materialType,
        thickness,
        dimension,
        quantity,
        weight,
        carre_utile: carreUtile,
        programme: programme,
        nombre_toles: nombreToles,
        start_time: data.startTime,
        status: 'RUNNING',
      };

      setOperationId(data.operationId);
      setCurrentOperation(runningOperation);
      setStartTime(data.startTime);
      setElapsedTime(0);
      loadOperations();
    } catch (error) {
      console.error("Error starting operation:", error);
      alert(error.message || "Cannot connect to the backend server.");
    } finally {
      setIsStarting(false);
    }
  };

  // Stop operation
  const stopOperation = async () => {
    if (!operationId) {
      alert("No operation selected to stop.");
      return;
    }
    if (isStopping) return;
    setIsStopping(true);

    try {
      const response = await fetch(`${API_URL}/api/operations/stop/${operationId}`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to stop operation");
      }

      setOperationId(null);
      setCurrentOperation(null);
      setStartTime(null);
      setElapsedTime(0);

      loadOperations();
    } catch (error) {
      console.error("Error stopping operation:", error);
      alert(error.message || "Cannot stop the operation.");
    } finally {
      setIsStopping(false);
    }
  };

  // Load operation history
  const loadOperations = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/operations`
      );

      const data = await response.json();

      setOperations(data);

      // Sync: if any running operation exists, show it in the timer
      const runningOp = data.find((op) => op.status === "RUNNING");
      if (runningOp) {
        setOperationId(runningOp.id);
        setCurrentOperation(runningOp);
        setStartTime(runningOp.start_time);
      } else {
        const stillRunning = data.some((op) => op.id === operationId && op.status === "RUNNING");
        if (!stillRunning) {
          setOperationId(null);
          setCurrentOperation(null);
          setStartTime(null);
          setElapsedTime(0);
        }
      }
    } catch (error) {
      console.error("Error loading operations:", error);
    }
  }, [operationId]);

  // Load history when application starts
  const loadRef = useRef(loadOperations);
  loadRef.current = loadOperations;

  useEffect(() => {
    loadRef.current();

    const interval = setInterval(() => {
      loadRef.current();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <header>
        <div className="header-brand">
          <img src="/logo.svg" alt="Entreprise Logo" className="brand-logo" />
          <div>
            <h1>Cutting Monitoring System</h1>
            <p>OXY • LASER • PLASMA</p>
          </div>
        </div>

        <div className="section-nav">
          <button
            className={currentSection === "operation" ? "active" : ""}
            onClick={() => setCurrentSection("operation")}
          >
            Operation
          </button>
          <button
            className={currentSection === "admin" ? "active" : ""}
            onClick={() => setCurrentSection("admin")}
          >
            Admin
          </button>
        </div>
      </header>

      <main>
        {currentSection === "operation" ? (
          <div className="operation-grid">
            <section className="card">
              <h2>New Cutting Operation</h2>

              <label>Machine</label>

              <select
                value={machine}
                onChange={(e) => setMachine(e.target.value)}
                disabled={operationId !== null || isStarting}
              >
                <option value="OXY">OXY</option>
                <option value="LASER">LASER</option>
                <option value="PLASMA">PLASMA</option>
              </select>

              <label>Nom de l'opérateur</label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                disabled={operationId !== null || isStarting}
                placeholder="Nom de l'opérateur"
              />

                  <label>Origine matière</label>
                  <select
                    value={originMatiere}
                    onChange={(e) => setOriginMatiere(e.target.value)}
                    disabled={operationId !== null || isStarting}
                  >
                    <option value="CLIENT">CLIENT</option>
                    <option value="GSM">GSM</option>
                  </select>

                  <label>Programme</label>
                  <input
                    type="text"
                    value={programme}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "" || raw === "P") {
                        setProgramme(raw);
                      } else {
                        setProgramme("P" + raw.replace(/^P/gi, ""));
                      }
                    }}
                    disabled={operationId !== null || isStarting}
                    placeholder="P (ex: 12345)"
                  />

                  <label>Type de matériau</label>
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                    disabled={operationId !== null || isStarting}
                  >
                    <option value="">Sélectionner...</option>
                    <option value="Acier noir">Acier noir</option>
                    <option value="Inox">Inox</option>
                    <option value="Cuivre">Cuivre</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                  {materialType === "AUTRE" && (
                    <input
                      type="text"
                      value={materialTypeOther}
                      onChange={(e) => setMaterialTypeOther(e.target.value)}
                      disabled={operationId !== null || isStarting}
                      placeholder="Tapez le type de matériau"
                    />
                  )}

                  <label>Épaisseur (mm)</label>
                  <input
                    type="text"
                    value={thickness}
                    onChange={(e) => setThickness(e.target.value)}
                    disabled={operationId !== null || isStarting}
                    placeholder="8"
                  />

                  <label>Dimension de la tôle</label>
                  <input
                    type="text"
                    value={dimension}
                    onChange={(e) => setDimension(e.target.value)}
                    disabled={operationId !== null || isStarting}
                    placeholder="3000 x 1500"
                  />

                  <label>Nb de pièces</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={operationId !== null || isStarting}
                    placeholder="42"
                  />

                  <label>Poids (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    disabled={operationId !== null || isStarting}
                    placeholder="310"
                  />

                  <label>Nombre de tôles</label>
                  <input
                    type="number"
                    value={nombreToles}
                    onChange={(e) => setNombreToles(e.target.value)}
                    disabled={operationId !== null || isStarting}
                    placeholder="5"
                  />

                  <label>Carré utile</label>
                  <input
                    type="text"
                    value={carreUtile}
                    onChange={(e) => setCarreUtile(e.target.value)}
                    disabled={operationId !== null || isStarting}
                    placeholder="Ex: 2500 x 1250"
                  />

              {/* Manual start/end moved to separate operator manual card below */}

              {!operationId ? (
                <button
                  className="start-button"
                  onClick={startOperation}
                  disabled={isStarting}
                >
                  <span className="button-dot button-dot-start"></span>
                  {isStarting ? "STARTING..." : "START OPERATION"}
                </button>
              ) : (
                <button
                  className="stop-button"
                  onClick={stopOperation}
                  disabled={isStopping}
                >
                  <span className="button-dot button-dot-stop"></span>
                  {isStopping ? "STOPPING..." : "STOP OPERATION"}
                </button>
              )}
            </section>

            <section className="card operator-manual">
              <h2>Saisie manuelle</h2>
              <div className="manual-fields">
                <select value={operatorManualMachine} onChange={e => setOperatorManualMachine(e.target.value)}>
                  <option value="OXY">OXY</option>
                  <option value="LASER">LASER</option>
                  <option value="PLASMA">PLASMA</option>
                </select>

                  <label>
                    Nom de l'opérateur
                    <input type="text" value={operatorManualName} onChange={e => setOperatorManualName(e.target.value)} placeholder="Nom de l'opérateur" />
                  </label>

                <label>
                  Origine matière
                  <select value={operatorManualOrigin} onChange={e => setOperatorManualOrigin(e.target.value)}>
                    <option value="CLIENT">CLIENT</option>
                    <option value="GSM">GSM</option>
                  </select>
                </label>

                <label>
                  Programme
                  <input type="text" value={operatorManualProgramme} onChange={e => setOperatorManualProgramme(e.target.value)} placeholder="P (ex: P12345)" />
                </label>

                <label>
                  Type de matériau
                  <select value={operatorManualMaterial} onChange={e => setOperatorManualMaterial(e.target.value)}>
                    <option value="">Sélectionner...</option>
                    <option value="Acier noir">Acier noir</option>
                    <option value="Inox">Inox</option>
                    <option value="Cuivre">Cuivre</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </label>
                {operatorManualMaterial === "AUTRE" && (
                  <label>
                    Autre matériau
                    <input type="text" value={operatorManualMaterialTypeOther} onChange={e => setOperatorManualMaterialTypeOther(e.target.value)} placeholder="Tapez le type de matériau" />
                  </label>
                )}

                <label>
                  Épaisseur (mm)
                  <input type="text" value={operatorManualThickness} onChange={e => setOperatorManualThickness(e.target.value)} placeholder="8" />
                </label>

                <label>
                  Dimension de la tôle
                  <input type="text" value={operatorManualDimension} onChange={e => setOperatorManualDimension(e.target.value)} placeholder="3000 x 1500" />
                </label>

                <label>
                  Nb de pièces
                  <input type="number" value={operatorManualQuantity} onChange={e => setOperatorManualQuantity(e.target.value)} placeholder="42" />
                </label>

                <label>
                  Poids (kg)
                  <input type="number" value={operatorManualWeight} onChange={e => setOperatorManualWeight(e.target.value)} placeholder="310" />
                </label>

                <label>
                  Nombre de tôles
                  <input type="number" value={operatorManualNombreToles} onChange={e => setOperatorManualNombreToles(e.target.value)} placeholder="5" />
                </label>

                <label>
                  Carré utile
                  <input type="text" value={operatorManualCarreUtile} onChange={e => setOperatorManualCarreUtile(e.target.value)} placeholder="Ex: 2500 x 1250" />
                </label>

                <label>
                  Début
                  <input type="datetime-local" value={operatorManualStart} onChange={e => setOperatorManualStart(e.target.value)} />
                </label>

                <label>
                  Fin (optionnelle)
                  <input type="datetime-local" value={operatorManualEnd} onChange={e => setOperatorManualEnd(e.target.value)} />
                </label>
              </div>
              <button
                className="refresh-button"
                onClick={async () => {
                  setOperatorManualError('');
                  if (!operatorManualStart) {
                    setOperatorManualError('Start time is required');
                    return;
                  }
                  try {
                    const startIso = new Date(operatorManualStart).toISOString();
                    const endIso = operatorManualEnd ? new Date(operatorManualEnd).toISOString() : null;
                    const resp = await fetch(`${API_URL}/api/operations/manual`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        machine: operatorManualMachine,
                        operator: operatorManualName,
                        origin_matiere: operatorManualOrigin,
                        thickness: operatorManualThickness,
                        dimension: operatorManualDimension,
                        quantity: operatorManualQuantity,
                        weight: operatorManualWeight,
                        carre_utile: operatorManualCarreUtile,
                        programme: operatorManualProgramme,
                        material_type: operatorManualMaterial === "AUTRE" ? operatorManualMaterialTypeOther : operatorManualMaterial,
                        nombre_toles: operatorManualNombreToles,
                        start_time: startIso,
                        end_time: endIso,
                      }),
                    });
                    const data = await resp.json();
                    if (!resp.ok) {
                      setOperatorManualError(data.error || 'Failed');
                      return;
                    }
                    setOperatorManualStart('');
                    setOperatorManualEnd('');
                    setOperatorManualName('');
                    setOperatorManualOrigin('CLIENT');
                    setOperatorManualMaterial('');
                    setOperatorManualThickness('');
                    setOperatorManualDimension('');
                    setOperatorManualQuantity('');
                    setOperatorManualWeight('');
                    setOperatorManualCarreUtile('');
                    setOperatorManualProgramme('');
                    setOperatorManualMaterialTypeOther('');
                    setOperatorManualNombreToles('');
                    loadOperations();
                    alert('Manual operation added');
                  } catch (err) {
                    setOperatorManualError(err.message || 'Failed to add manual operation');
                  }
                }}
              >
                Add Manual
              </button>
              {operatorManualError ? <p style={{ color: 'red' }}>{operatorManualError}</p> : null}
            </section>

            <section className="card timer-card">
              <h2>Current Operation</h2>

              {currentOperation ? (
                <>
                  <h3>{currentOperation.machine}</h3>

                  <div className="timer">{formatTime(elapsedTime)}</div>

                  <p>Début: {formatTimestamp(currentOperation.start_time)}</p>
                  <p>Opérateur: {currentOperation.operator || '-'}</p>
                  <p>Origine matière: {currentOperation.origin_matiere || '-'}</p>
                  <p>Programme: {currentOperation.programme || '-'}</p>
                  <p>Matériau: {currentOperation.material_type || '-'}</p>
                  <p>Épaisseur: {currentOperation.thickness || '-'}</p>
                  <p>Dimension: {currentOperation.dimension || '-'}</p>
                  <p>Qté: {currentOperation.quantity || '-'}</p>
                  <p>Poids: {currentOperation.weight || '-'}</p>
                  <p>Nb tôles: {currentOperation.nombre_toles || '-'}</p>
                  <p>Carré utile: {currentOperation.carre_utile || '-'}</p>
                  <p>Operation in progress</p>
                </>
              ) : operationId ? (
                <p>Loading operation details...</p>
              ) : (
                <p>No operation currently running</p>
              )}
            </section>
          </div>
        ) : (
          <section className="admin-panel">
            <div className="admin-header">
              <div>
                <h2>Admin Panel</h2>
                {adminUser ? (
                  <span>
                    Signed in as <strong>{adminUser}</strong>
                  </span>
                ) : null}
              </div>

              <div className="admin-actions">
                {adminUser ? (
                  <button className="pdf-button" onClick={exportPdf}>
                    Export History PDF
                  </button>
                ) : null}
                  {adminUser ? (
                    <button className="delete-button" onClick={deleteHistory}>
                      Delete History
                    </button>
                  ) : null}
                {adminUser ? (
                  <button className="refresh-button" onClick={logoutAdmin}>
                    Sign out
                  </button>
                ) : null}
              </div>
            </div>

            {!adminUser ? (
              <div className="admin-login">
                <h3>Admin login</h3>
                <label>Username</label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                />
                <label>Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
                {adminError ? (
                  <p className="admin-error">{adminError}</p>
                ) : null}
                <button className="refresh-button" onClick={loginAdmin}>
                  Sign in
                </button>
              </div>
            ) : (
              <>
                <div className="admin-stats">
                  <div className="stat-card">
                    <p>Total operations</p>
                    <strong>{totalOperations}</strong>
                  </div>
                  <div className="stat-card">
                    <p>Running</p>
                    <strong>{runningOperations}</strong>
                  </div>
                  <div className="stat-card">
                    <p>Completed</p>
                    <strong>{completedOperations}</strong>
                  </div>
                </div>

                <section className="history">
                  <h2>Operation History</h2>

                  <table>
                    <thead>
                      <tr>
                        <th>Machine</th>
                        <th>Prog.</th>
                        <th>Opérateur</th>
                        <th>BL</th>
                        <th>Client</th>
                        <th>Origine</th>
                        <th>Matériau</th>
                        <th>Épaisseur</th>
                        <th>Dimension</th>
                        <th>Qté</th>
                        <th>Poids</th>
                        <th>Nb tôles</th>
                        <th>Carré utile</th>
                        <th>Début</th>
                        <th>Fin</th>
                        <th>Durée</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operations.map((operation) => (
                        <tr key={operation.id}>
                          <td>{operation.machine}</td>
                          <td>{operation.programme || "-"}</td>
                          <td>{operation.operator || "-"}</td>
                          <td>{operation.bl_number || operation.job_number || "-"}</td>
                          <td>{operation.client || "-"}</td>
                          <td>{operation.origin_matiere || "-"}</td>
                          <td>{operation.material_type || "-"}</td>
                          <td>{operation.thickness || "-"}</td>
                          <td>{operation.dimension || "-"}</td>
                          <td>{operation.quantity || "-"}</td>
                          <td>{operation.weight || "-"}</td>
                          <td>{operation.nombre_toles || "-"}</td>
                          <td>{operation.carre_utile || "-"}</td>
                          <td>{formatTimestamp(operation.start_time)}</td>
                          <td>{formatTimestamp(operation.end_time)}</td>
                          <td>
                            {operation.duration
                              ? formatTime(operation.duration)
                              : "-"}
                          </td>
                          <td>
                            <span
                              className={`status-dot ${
                                operation.status === "RUNNING"
                                  ? "status-running"
                                  : "status-completed"
                              }`}
                            />
                            {operation.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
