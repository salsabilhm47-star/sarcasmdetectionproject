import { useState } from "react";
import { useAnalysis } from "../context/AnalysisContext";
import type { AnalysisResult, SarcasmClass } from "../context/AnalysisContext";

interface AdvancedAnalysis {
    sarcasmType: "direct" | "indirect" | "none";
    target: string;
    intensity: "weak" | "medium" | "strong";
    indicators: string[];
    highlightedWords: string[];
    confidenceScore: number;
}

// Confidence Bar component
const ConfidenceBar = ({ value, label }: { value: number; label?: string }) => {
    const getColor = () => {
        if (value >= 80) return "#00ff88";
        if (value >= 60) return "#ffcc44";
        return "#ff6b8a";
    };

    return (
        <div className="confidence-bar-wrapper">
            {label && <div className="confidence-label">{label}</div>}
            <div className="confidence-bar-bg">
                <div
                    className="confidence-bar-fill"
                    style={{
                        width: `${value}%`,
                        background: `linear-gradient(90deg, ${getColor()}, ${getColor()}cc)`
                    }}
                >
                    <span className="confidence-value">{value}%</span>
                </div>
            </div>
        </div>
    );
};

// Radar chart component
const SarcasmRadar = ({ intensity }: { intensity: string }) => {
    const getScore = () => {
        switch(intensity) {
            case "strong": return 90;
            case "medium": return 60;
            case "weak": return 30;
            default: return 0;
        }
    };

    const score = getScore();

    return (
        <div className="radar-container">
            <svg viewBox="0 0 200 200" className="radar-svg">
                <polygon
                    points="100,20 160,60 160,140 100,180 40,140 40,60"
                    fill="rgba(0,200,255,0.05)"
                    stroke="rgba(0,200,255,0.3)"
                    strokeWidth="1"
                />
                <polygon
                    points="100,50 135,75 135,125 100,150 65,125 65,75"
                    fill="rgba(0,200,255,0.1)"
                    stroke="rgba(0,200,255,0.4)"
                    strokeWidth="1"
                />
                <polygon
                    points="100,80 115,95 115,115 100,130 85,115 85,95"
                    fill="rgba(0,200,255,0.2)"
                    stroke="rgba(0,200,255,0.5)"
                    strokeWidth="1"
                />
                <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(0,200,255,0.2)" strokeWidth="0.5" />
                <line x1="40" y1="100" x2="160" y2="100" stroke="rgba(0,200,255,0.2)" strokeWidth="0.5" />
                <circle
                    cx="100"
                    cy="100"
                    r={score * 0.8}
                    fill="rgba(0,229,196,0.15)"
                    stroke="rgba(0,229,196,0.6)"
                    strokeWidth="2"
                />
                <text x="100" y="15" textAnchor="middle" fill="#00e5c4" fontSize="10">Sarcasm</text>
                <text x="170" y="105" textAnchor="middle" fill="#00e5c4" fontSize="10">Direct</text>
                <text x="100" y="195" textAnchor="middle" fill="#00e5c4" fontSize="10">Indirect</text>
                <text x="30" y="105" textAnchor="middle" fill="#00e5c4" fontSize="10">Weak</text>
                <text x="55" y="35" textAnchor="middle" fill="#00e5c4" fontSize="10">Strong</text>
            </svg>
            <div className="radar-score">
                <span className="score-value">{score}</span>
                <span className="score-label">Sarcasm Score</span>
            </div>
        </div>
    );
};

// Keywords cloud component
const KeywordsCloud = ({ words }: { words: string[] }) => {
    return (
        <div className="keywords-cloud">
            {words.map((word, idx) => (
                <span
                    key={idx}
                    className="keyword-tag"
                    style={{
                        fontSize: `${Math.random() * 10 + 12}px`,
                        animationDelay: `${idx * 0.1}s`
                    }}
                >
                    {word}
                </span>
            ))}
        </div>
    );
};

// Progress ring component
const ProgressRing = ({ value, label }: { value: number; label: string }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="progress-ring-container">
            <svg width="100" height="100" viewBox="0 0 100 100">
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                />
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform="rotate(-90 50 50)"
                />
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#00aaff" />
                        <stop offset="100%" stopColor="#00e5c4" />
                    </linearGradient>
                </defs>
                <text x="50" y="55" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold">
                    {value}
                </text>
                <text x="50" y="70" textAnchor="middle" fill="#a0b3d9" fontSize="8">
                    {label}
                </text>
            </svg>
        </div>
    );
};

const Dashboard = () => {

    const { results, clearResults, isLoading, error } = useAnalysis();

    const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
    const [showAdvancedModal, setShowAdvancedModal] = useState(false);
    const [filter, setFilter] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState<string>("");

    // Filtering results
    const filteredResults = results.filter(r => {
        if (filter !== "all" && r.cls !== filter) return false;
        if (searchTerm && !r.text.includes(searchTerm)) return false;
        return true;
    });

    const counts = {
        sarcasm: results.filter(r => r.cls === "sarcasm").length,
        not_sarcasm: results.filter(r => r.cls === "not_sarcasm").length,
    };

    const percentages = {
        sarcasm: results.length > 0 ? Math.round((counts.sarcasm / results.length) * 100) : 0,
        not_sarcasm: results.length > 0 ? Math.round((counts.not_sarcasm / results.length) * 100) : 0,
    };

    const badgeClass: Record<SarcasmClass, string> = {
        sarcasm: "badge badge-sarcasm",
        not_sarcasm: "badge badge-normal",
    };

    const getAdvancedAnalysis = (result: AnalysisResult): AdvancedAnalysis => {
        let sarcasmType: "direct" | "indirect" | "none" = "none";
        let target = "Not specified";
        let intensity: "weak" | "medium" | "strong" = "medium";
        let indicators: string[] = [...result.indicators];
        let highlightedWords: string[] = [...result.intent_words];

        if (result.cls === "sarcasm") {
            const text = result.text.toLowerCase();

            if (text.includes("رائع") || text.includes("عظيم") || text.includes("ممتاز")) {
                sarcasmType = "direct";
                indicators.push("Clear contradiction between apparent and intended meaning");
                indicators.push("Exaggerated praise words");
            } else if (text.includes("طبعاً") || text.includes("أكيد")) {
                sarcasmType = "indirect";
                indicators.push("Use of affirming phrases in a sarcastic way");
            } else {
                sarcasmType = "direct";
                indicators.push("Exaggeration in description");
            }

            if (text.includes("عبقري") || text.includes("أسطورة")) {
                target = "Specific person";
                intensity = "strong";
                indicators.push("Direct mockery of a person");
            } else if (text.includes("عمل") || text.includes("منتدى")) {
                target = "Work/Product";
                intensity = "medium";
            } else {
                intensity = result.conf > 85 ? "strong" : result.conf > 70 ? "medium" : "weak";
            }
        } else {
            indicators.push("Neutral and positive language");
            indicators.push("No signs of sarcasm or hate speech");
        }

        return { sarcasmType, target, intensity, indicators, highlightedWords, confidenceScore: result.conf };
    };

    const handleViewDetails = (result: AnalysisResult) => {
        setSelectedResult(result);
        setShowAdvancedModal(true);
    };

    const closeModal = () => {
        setShowAdvancedModal(false);
        setSelectedResult(null);
    };

    const getIntensityText = (intensity: string) => {
        switch(intensity) {
            case "weak": return "Weak";
            case "medium": return "Medium";
            case "strong": return "Strong";
            default: return "Not specified";
        }
    };

    const getIntensityColor = (intensity: string) => {
        switch(intensity) {
            case "weak": return "#ffaa44";
            case "medium": return "#ff6b6b";
            case "strong": return "#ff4444";
            default: return "#ccc";
        }
    };

    const advanced = selectedResult ? getAdvancedAnalysis(selectedResult) : null;

    return (
        <div className="page dashboard-container">
            <h1>📊 Dashboard</h1>
            <p className="dash-subtitle">Advanced sarcasm analysis in Arabic texts</p>

            {/* Loading and Error States */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p>جاري التحليل...</p>
                </div>
            )}

            {error && (
                <div className="error-banner">
                    ⚠️ {error}
                    <button onClick={() => window.location.reload()}>إعادة المحاولة</button>
                </div>
            )}

            {/* Statistics section */}
            <div className="stats-section">
                <div className="dash-stats">
                    <div className="dash-card" onClick={() => setFilter("sarcasm")}>
                        <div className="dash-icon ic-sarcasm">😏</div>
                        <div>
                            <div className="dash-num amber">{counts.sarcasm}</div>
                            <div className="dash-label">Sarcasm</div>
                            <div className="stat-percentage">{percentages.sarcasm}%</div>
                        </div>
                        <ProgressRing value={percentages.sarcasm} label="Sarcasm" />
                    </div>

                    <div className="dash-card" onClick={() => setFilter("not_sarcasm")}>
                        <div className="dash-icon ic-normal">✅</div>
                        <div>
                            <div className="dash-num green">{counts.not_sarcasm}</div>
                            <div className="dash-label">Normal</div>
                            <div className="stat-percentage">{percentages.not_sarcasm}%</div>
                        </div>
                        <ProgressRing value={percentages.not_sarcasm} label="Normal" />
                    </div>
                </div>

                {/* Clear Button */}
                {results.length > 0 && (
                    <button className="clear-all-btn" onClick={clearResults}>
                        🗑️ Clear All Results
                    </button>
                )}

                {(filter !== "all" || searchTerm) && (
                    <div className="filter-bar">
                        <span>Filter: </span>
                        <span className="filter-badge">
                            {filter === "sarcasm" ? "😏 Sarcasm" :
                                filter === "not_sarcasm" ? "✅ Normal" : "All"}
                            <button onClick={() => { setFilter("all"); setSearchTerm(""); }} className="clear-filter">✕</button>
                        </span>
                    </div>
                )}
            </div>

            {/* Search bar */}
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="🔍 Search in texts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
                    <option value="all">All</option>
                    <option value="sarcasm">Sarcasm</option>
                    <option value="not_sarcasm">Normal</option>
                </select>
            </div>

            {/* Results table */}
            <div className="table-wrap">
                <div className="table-header">
                    <span className="table-title">📝 Analysis Results</span>
                    <span className="badge-count">{filteredResults.length} analyzed texts</span>
                </div>

                {filteredResults.length === 0 ? (
                    <div className="empty-state">
                        {results.length === 0 ? (
                            <>
                                <span>📭</span>
                                <p>No texts analyzed yet</p>
                                <small>Send a text from the Chat page to see results here</small>
                            </>
                        ) : (
                            <>
                                <span>😕</span>
                                <p>No results match the search criteria</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="results-table">
                            <thead>
                            <tr>
                                <th>Text</th>
                                <th>Classification</th>
                                <th>Confidence</th>
                                <th>Advanced Analysis</th>
                            </tr>
                            </thead>
                            <tbody>
                            {[...filteredResults].reverse().map((r, i) => {
                                const adv = getAdvancedAnalysis(r);
                                return (
                                    <tr key={i} className="result-row">
                                        <td className="text-cell">
                                            {adv.highlightedWords.length > 0 ? (
                                                <div className="highlighted-text">
                                                    {r.text.split(/(\s+)/).map((word, idx) => {
                                                        const isHighlighted = adv.highlightedWords.some(
                                                            hw => word.includes(hw)
                                                        );
                                                        return isHighlighted ? (
                                                            <mark key={idx} className="highlight-word">{word}</mark>
                                                        ) : (
                                                            <span key={idx}>{word}</span>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                r.text
                                            )}
                                        </td>
                                        <td><span className={badgeClass[r.cls]}>{r.type}</span></td>
                                        <td>
                                            <ConfidenceBar value={r.conf} />
                                        </td>
                                        <td>
                                            <button className="btn-details" onClick={() => handleViewDetails(r)}>
                                                🔍 Advanced Analysis
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Advanced analysis modal */}
            {showAdvancedModal && selectedResult && advanced && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🧾 Advanced Sarcasm Analysis</h2>
                            <button className="modal-close" onClick={closeModal}>✕</button>
                        </div>

                        <div className="modal-body">
                            {/* Original text with highlighting */}
                            <div className="analysis-section">
                                <h3>📝 Input Text</h3>
                                <div className="original-text">
                                    {advanced.highlightedWords.length > 0 ? (
                                        <div className="highlighted-text">
                                            {selectedResult.text.split(/(\s+)/).map((word, idx) => {
                                                const isHighlighted = advanced.highlightedWords.some(
                                                    hw => word.includes(hw)
                                                );
                                                return isHighlighted ? (
                                                    <mark key={idx} className="highlight-word-modal">{word}</mark>
                                                ) : (
                                                    <span key={idx}>{word}</span>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        selectedResult.text
                                    )}
                                </div>
                            </div>

                            {/* Main result */}
                            <div className="analysis-section">
                                <h3>🎯 Main Result</h3>
                                <div className={`result-badge ${selectedResult.cls}`}>
                                    <span className="result-icon">
                                        {selectedResult.cls === "sarcasm" ? "😏" : "✅"}
                                    </span>
                                    <span className="result-text">{selectedResult.type}</span>
                                </div>
                                <ConfidenceBar value={selectedResult.conf} label="Confidence Score" />
                            </div>

                            {/* Detailed analysis */}
                            {selectedResult.cls === "sarcasm" && (
                                <>
                                    <div className="analysis-section">
                                        <h3>🔍 Detailed Sarcasm Analysis</h3>
                                        <div className="analysis-grid">
                                            <div className="analysis-item">
                                                <label>Sarcasm Type:</label>
                                                <span className={`sarcasm-type ${advanced.sarcasmType}`}>
                                                    {advanced.sarcasmType === "direct" ? "Direct" :
                                                        advanced.sarcasmType === "indirect" ? "Indirect" : "Not specified"}
                                                </span>
                                            </div>
                                            <div className="analysis-item">
                                                <label>Target:</label>
                                                <span className="target-value">{advanced.target}</span>
                                            </div>
                                            <div className="analysis-item">
                                                <label>Intensity:</label>
                                                <span className={`intensity-${advanced.intensity}`}>
                                                    {getIntensityText(advanced.intensity)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="sarcasm-meter-container">
                                            <label>Sarcasm Intensity Meter:</label>
                                            <div className="sarcasm-meter">
                                                <div className="meter-bar">
                                                    <div
                                                        className="meter-fill"
                                                        style={{
                                                            width: advanced.intensity === "weak" ? "33%" :
                                                                advanced.intensity === "medium" ? "66%" : "100%",
                                                            backgroundColor: getIntensityColor(advanced.intensity)
                                                        }}
                                                    />
                                                </div>
                                                <div className="meter-labels">
                                                    <span>Weak</span>
                                                    <span>Medium</span>
                                                    <span>Strong</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="radar-section">
                                            <label>Radar Representation:</label>
                                            <SarcasmRadar intensity={advanced.intensity} />
                                        </div>
                                    </div>

                                    <div className="analysis-section">
                                        <h3>📋 Indicators and Reasons</h3>
                                        <ul className="indicators-list">
                                            {advanced.indicators.map((indicator, idx) => (
                                                <li key={idx}>
                                                    <span className="indicator-icon">🔍</span>
                                                    {indicator}
                                                </li>
                                            ))}
                                        </ul>

                                        {advanced.highlightedWords.length > 0 && (
                                            <>
                                                <h3>🏷️ Keywords</h3>
                                                <KeywordsCloud words={advanced.highlightedWords} />
                                            </>
                                        )}
                                    </div>

                                    <div className="analysis-section">
                                        <h3>📊 Visual Representation</h3>
                                        <div className="visualization">
                                            <div className="viz-title">Analysis Confidence Score</div>
                                            <div className="viz-bar-container">
                                                <div className="viz-bar">
                                                    <div
                                                        className="viz-fill"
                                                        style={{ width: `${selectedResult.conf}%` }}
                                                    >
                                                        {selectedResult.conf}%
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="viz-labels">
                                                <span>0%</span>
                                                <span>25%</span>
                                                <span>50%</span>
                                                <span>75%</span>
                                                <span>100%</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {selectedResult.cls === "not_sarcasm" && (
                                <div className="analysis-section success">
                                    <h3>✅ Normal Text Analysis</h3>
                                    <p>The text contains no indicators of sarcasm or hate speech.</p>
                                    <div className="indicators-list">
                                        {advanced.indicators.map((indicator, idx) => (
                                            <li key={idx}>✓ {indicator}</li>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-close" onClick={closeModal}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;