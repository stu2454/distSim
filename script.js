function calculateFinalBenchmark() {
    // Get input values
    const currentBenchmark = parseFloat(document.getElementById('currentBenchmark').value);
    const dataDirectionSignal = document.getElementById('dataDirectionSignal').value;
    let proposedBMData = parseFloat(document.getElementById('proposedBMData').value); // Can be modified by Phase 2 reconciliation

    const raiseProximityDelta = parseFloat(document.getElementById('raiseProximityDelta').value);
    const lowerProximityDelta = parseFloat(document.getElementById('lowerProximityDelta').value);
    const isCloseToButLessThanPriority = document.getElementById('isCloseToButLessThanPriority').checked;

    // Output elements
    const finalDecisionEl = document.getElementById('finalDecision');
    const finalProposedBMEl = document.getElementById('finalProposedBM');
    const rationaleEl = document.getElementById('rationale');

    // --- Start of Phase 3.3 Logic ---
    let finalDecision = dataDirectionSignal; // Initial assumption
    let finalProposedBM = proposedBMData;   // Initial assumption
    let rationale = "";

    const budgetTiers = [5000, 10000, 15000]; // Add more if needed

    // --- 3.3.1. If Data_Direction_Signal is "Raise" ---
    if (dataDirectionSignal === "Raise") {
        let nextTBA = -1;
        for (const tier of budgetTiers) {
            if (tier > proposedBMData) {
                nextTBA = tier;
                break;
            }
        }
        // If proposedBMData is already above the highest tier, nextTBA remains -1
        if (nextTBA === -1 && proposedBMData > budgetTiers[budgetTiers.length -1]) {
             // No higher TBA to aim for, keep P75
            rationale = `Data suggests raising. The P75-derived value ($${proposedBMData.toFixed(2)}) is above the highest defined budget tier. The proposed benchmark remains the P75-derived value.`;
        } else if (nextTBA !== -1 && proposedBMData < nextTBA && (nextTBA - proposedBMData <= raiseProximityDelta)) {
            finalDecision = "Raise to Budget Increment";
            finalProposedBM = nextTBA;
            rationale = `Data suggests raising. The P75-derived value ($${proposedBMData.toFixed(2)}) is within $${raiseProximityDelta.toFixed(2)} of the next budget step ($${nextTBA.toFixed(2)}). Adjusted to $${nextTBA.toFixed(2)} for system alignment.`;
        } else {
            rationale = `Data suggests raising. The P75-derived value ($${proposedBMData.toFixed(2)}) is not close enough (within $${raiseProximityDelta.toFixed(2)}) to the next budget step` + (nextTBA !== -1 ? ` ($${nextTBA.toFixed(2)})` : '') + ` to warrant alignment. The proposed benchmark remains the P75-derived value.`;
        }
    }
    // --- 3.3.2. If Data_Direction_Signal is "Lower" ---
    else if (dataDirectionSignal === "Lower") {
        let relevantLowerTBAFloor = -1;
        for (let i = budgetTiers.length - 1; i >= 0; i--) {
            if (budgetTiers[i] < currentBenchmark) { // Must be less than CURRENT benchmark
                relevantLowerTBAFloor = budgetTiers[i];
                break;
            }
        }

        if (relevantLowerTBAFloor !== -1 && currentBenchmark > relevantLowerTBAFloor && proposedBMData < relevantLowerTBAFloor) {
            const gap = relevantLowerTBAFloor - proposedBMData;
            if (gap >= 0 && gap <= lowerProximityDelta) { // Gap must be positive or zero
                finalDecision = "Lower to Budget Increment Floor";
                finalProposedBM = relevantLowerTBAFloor;
                rationale = `Data suggests lowering. The current benchmark ($${currentBenchmark.toFixed(2)}) was above a budget floor ($${relevantLowerTBAFloor.toFixed(2)}). The P75-derived value ($${proposedBMData.toFixed(2)}) is only $${gap.toFixed(2)} below this floor (within $${lowerProximityDelta.toFixed(2)} tolerance). Adjusted to $${relevantLowerTBAFloor.toFixed(2)} to avoid an awkward benchmark.`;
            } else {
                // Gap is too large, or proposedBMData is not below the floor (though logic implies it should be if dataDirectionSignal is "Lower" and proposedBMData is P75)
                rationale = `Data suggests lowering. The P75-derived value ($${proposedBMData.toFixed(2)}) is the proposed benchmark. ` + (gap < 0 ? `The P75 value is not below the relevant budget floor of $${relevantLowerTBAFloor.toFixed(2)}.` : `The gap ($${gap.toFixed(2)}) to the budget floor ($${relevantLowerTBAFloor.toFixed(2)}) is too large (>$${lowerProximityDelta.toFixed(2)}) to justify holding at the floor.`);
            }
        } else {
            rationale = `Data suggests lowering. The P75-derived value ($${proposedBMData.toFixed(2)}) is the proposed benchmark. Conditions for budget floor alignment were not met (e.g., no relevant floor below current benchmark, or P75 value not below such floor).`;
        }
    }
    // --- 3.3.3. If Data_Direction_Signal is "Hold" ---
    else if (dataDirectionSignal === "Hold") {
        finalDecision = "Hold"; // Default for Hold
        finalProposedBM = currentBenchmark; // Default for Hold is current benchmark if P75 is close
        
        if (isCloseToButLessThanPriority) {
            // Check if P75 (proposedBMData, which for "Hold" signal means P75 is already close to CB) supports current level
            // The methodology implies that if Data_Direction_Signal is "Hold", PmtAmt_P75_B2 is already near the CurrentBenchmark.
            // So, the main condition is just being on the priority list.
             rationale = `Data suggests holding. The item was on the 'close to but less than' priority list, and its P75-derived value supports the current benchmark level ($${currentBenchmark.toFixed(2)}). No automatic push to a higher budget tier unless P75 data itself suggested a raise.`;
        } else {
             rationale = `Data suggests holding. The P75-derived value is close to the current benchmark ($${currentBenchmark.toFixed(2)}), and the item was not on a specific budget alignment priority list for 'Hold' cases.`;
        }
         // If P75 was actually suggesting a raise that got overridden to HOLD in Phase 2, this logic might need more nuance.
         // For now, assuming if Data_Direction_Signal is "Hold", P75 is indeed close to CB.
         // Your document states: "IF the item was on that specific 'close to but less than' priority list AND Data_Direction_Signal is 'Hold' (meaning PmtAmt_P75_B2 is already near the CurrentBenchmark), THEN Final_Decision = 'Hold', Final_Proposed_BM = CurrentBenchmark"
         // This means if it *wasn't* on the priority list, it's still "Hold" at CurrentBenchmark based on P75 being close.
         // The 'unless P75 itself was already suggesting a raise' is covered by the fact Data_Direction_Signal would be "Raise" not "Hold".
    }

    // Update output elements
    finalDecisionEl.textContent = finalDecision;
    finalProposedBMEl.textContent = finalProposedBM.toFixed(2);
    rationaleEl.innerHTML = rationale; // Use innerHTML if rationale might include simple formatting later, else textContent
}

// Optional: Initial calculation on load if you want defaults to show results immediately
// window.onload = calculateFinalBenchmark;
