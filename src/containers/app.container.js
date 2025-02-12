import React, { useState, useEffect, useReducer } from "react";

import "semantic-ui-css/semantic.min.css";
import "../css/style.css";

import LeftControls from "../components/panels/left-controls.component";
import MainViewer from "../components/panels/main-viewer.component";

import { ValueToHexPair, HexPairToValue } from "../helpers/token.helpers";
import { ValidateURL } from "../helpers/url.helpers";

const nullHash = "0x0000000000000000000000000000000000000000000000000000000000000000";

const loopReducer = (state, action) => {
    switch (action.type) {
        case "tick":
            if (state === false) state = -1;
            return state + 1;
        case "reset":
            return false;
        default:
            return state;
    }
};

const App = () => {
    const [url, setUrl] = useState("");
    const [isValidUrl, setUrlValid] = useState(false);

    const [hash, setHash] = useState(nullHash);
    const [hashHistory, setHashHistory] = useState([]);

    const [values, setValues] = useState(() => {
        var v = {};
        for (let i = 0; i < 32; i++) {
            v[i] = 0;
        }
        return v;
    });

    const [randomHash, triggerRandom] = useState(false);

    useEffect(() => {
        if (randomHash) triggerRandom(false);
    }, [randomHash]);

    const screenshot = () => {
        var iframe = window.document.querySelector("iframe").contentWindow;
        if (iframe === undefined) return;
        iframe.postMessage({ command: "screenshot", token: hash }, "*");
    };

    const [stopping, setStopping] = useState(false);
    const [progress, setProgress] = useState(0);
    const [state, dispatch] = useReducer(loopReducer, false);
    const [tick, setTick] = useState(null);
    const [total, setTotal] = useState(0);

    const [features, setFeatures] = useState({});
    const [featuresList, setFeaturesList] = useState([]);
    const [doCSVExport, setCSVExport] = useState(false);

    const exportCSV = (list) => {
        let csvContent = "data:text/csv;charset=utf-8,";

        csvContent += Object.keys(features).map((key) => {
            return key;
        });
        csvContent += "\r\n";

        list.map((features) => {
            csvContent += Object.keys(features).map((key) => {
                return features[key];
            });
            csvContent += "\r\n";
        });

        var encodedUri = encodeURI(csvContent);
        var hrefElement = document.createElement("a");
        hrefElement.href = encodedUri;
        hrefElement.download = `features_${new Date().toJSON().slice(0, 10)}.csv`;
        document.body.appendChild(hrefElement);
        hrefElement.click();
        hrefElement.remove();
    };

    function startAutomation(total, wait, csv) {
        setProgress(0);
        setFeaturesList([]);
        setTotal(total);
        setCSVExport(csv);
        setStopping(false);
        triggerRandom(true);
        setTick(
            setInterval(() => {
                dispatch({ type: "tick" });
            }, wait)
        );
    }

    function stopAutomation() {
        if (stopping) return;
        clearInterval(tick);
        setTick(null);
        setTotal(0);
        dispatch({ type: "reset" });
        setProgress(100);
        setStopping(true);
        if (doCSVExport) {
            exportCSV(featuresList);
        }
    }

    useEffect(() => {
        if (!state || isNaN(state)) return;
        if (state > total) {
            stopAutomation();
            return;
        }
        screenshot();
        if (doCSVExport) {
            setTimeout(() => {
                var f = features;
                f["Hash"] = hash;
                setFeaturesList((prev) => [...prev, f]);
            }, 1000);
        }
        setProgress(parseInt((state / total) * 100));
        if (state === total) return;
        triggerRandom(true);
    }, [state]);

    const [iFrameKey, setIframeKey] = useState(0);

    const setValueAtIndex = (i, v) => {
        setValues((prev) => ({
            ...prev,
            [i]: v,
        }));
    };

    const setHashValues = (h) => {
        h = h.substring(2);
        for (let i = 0; i < 32; i++) {
            setValueAtIndex(i, HexPairToValue(h[i * 2] + h[i * 2 + 1]));
        }
    };

    const setUrlValue = (u) => {
        if (url === u) return;
        setUrl(u);
        setUrlValid(ValidateURL(u));
    };

    const clearHistory = () => {
        setHashValues(nullHash);
        setHashHistory([nullHash]);
    };

    const refresh = () => {
        setIframeKey(iFrameKey + 1);
    };

    useEffect(() => {
        var h = "0x";
        for (let i = 0; i < 32; i++) {
            h += ValueToHexPair(values[i]);
        }
        if (hash !== h) {
            var history = hashHistory;
            if (history[history.length - 1] === h) {
                history.pop();
            } else {
                if (hash !== undefined) history.push(hash);
            }
            setHashHistory(history);
            setHash(h);
        }
    }, [values, hash, hashHistory]);

    return (
        <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
            <div style={{ width: 480, position: "absolute", top: 20, left: 20 }}>
                <LeftControls
                    hash={hash}
                    values={values}
                    hashHistory={hashHistory}
                    setValueAtIndex={setValueAtIndex}
                    setHashValues={setHashValues}
                    clearHistory={clearHistory}
                    isValidUrl={isValidUrl}
                    randomHash={randomHash}
                    triggerRandom={triggerRandom}
                    startAutomation={startAutomation}
                    stopAutomation={stopAutomation}
                    progress={progress}
                />
            </div>
            <div
                style={{
                    marginLeft: 500,
                    padding: 20,
                    height: "100vh",
                    width: "auto",
                    minWidth: 800,
                }}
            >
                <MainViewer
                    hash={hash}
                    url={url}
                    isValidUrl={isValidUrl}
                    setUrlValue={setUrlValue}
                    iFrameKey={iFrameKey}
                    refresh={refresh}
                    screenshot={screenshot}
                    features={features}
                    setFeatures={setFeatures}
                />
            </div>
        </div>
    );
};

export default App;
