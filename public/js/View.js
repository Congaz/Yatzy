import {Controller} from "./Controller.js";

export class View {
    #elms = {
        gameOverPrompt: {
            mp_outerWrapper: null,
            mp_innerWrapper: null,
            mp_container: null,
            mp_header: null,
            mp_totalDigit_1: null,
            mp_totalDigit_2: null,
            mp_totalDigit_3: null,
            mp_totalDigit_4: null,
            mp_btnPlayAgain: null,
        },
        pageOverlay: null,
        pageWrapper: null,
        guiOverlay: null,
        dice: {
            imgDie1: null,
            imgDie2: null,
            imgDie3: null,
            imgDie4: null,
            imgDie5: null
        },
        rollsRemaining: null,
        btnRoll: null,
        scoreContainer: null,
        categories: {
            // Upper section
            ones: null,
            twos: null,
            threes: null,
            fours: null,
            fives: null,
            sixes: null,
            // Lower section
            onePair: null,
            twoPairs: null,
            threeOfAKind: null,
            fourOfAKind: null,
            fullHouse: null,
            smallStraight: null,
            largeStraight: null,
            chance: null,
            yahtzee: null,
        },
        results: {
            // Upper section
            upperSectionSum: null,
            bonus: null,
            // Lower section
            lowerSectionSum: null,
            total: null
        }
    };

    #dieOrder = [
        "imgDie1",
        "imgDie2",
        "imgDie3",
        "imgDie4",
        "imgDie5"
    ];

    #dieImages = [
        "0.png",
        "1.png",
        "2.png",
        "3.png",
        "4.png",
        "5.png",
        "6.png",
    ];

    #diceTransitionParams = {
        out: {
            delay: 0,
            delayInc: 50,
            duration: 400,
        },
        in: {
            delay: 100,
            delayInc: 50,
            duration: 400,
        }
    }

    #dieImageDir;
    #diceTransitionSync = [];
    #gameOverTransitionSync = [];
    #blockCommit;
    #windowScrollPos = [0, 0]; // X/Y.
    #ctrl = null;
    static self = this;

    constructor() {
        this.#dieImageDir = "/public/images/dice/blackEyes/";
        this.#resolveElmIds(this.#elms);
        this.#attachListeners();
    }

    attachController(ctrl) {
        if (!ctrl instanceof Controller) throw new Error("TypeMismatch. Instance of class Controller expected.");
        this.#ctrl = ctrl;
    }

    setGuiState(state) {
        switch (state) {
            case "newGame":
                 // *** TEST *****************
                if (0) {
                    this.setGuiState("gameOver");
                    break;
                }
                // ****************************
                this.#ctrl.reset(); // Resets model for new game.
                // --- Resets gui to game start state ---
                this.#resetDice(); // Set die faces to non-value.
                this.#disableCommit(); // Prevent selection of score categories.
                this.#updateRollCount();
                this.#resetCategories(); // Reset styling of categories.
                this.#clearUnusedCategories(); // Remove value from unused score category fields.
                this.#updateResults(); // Update sum, bonus and total fields.
                this.#enableRollBtn();
                // IdleAnimation
                this.#idleAnimation();
                break;
            case "roll":
                // *** TEST *****************
                if (0) {
                    this.setGuiState("gameOver");
                    break;
                }
                // ****************************
                // --- Called on click of roll button ---
                this.#disableRollBtn();
                this.#disableCommit(); // Prevent selection of score categories.
                // Roll and get result.
                let dieValues = this.#ctrl.roll();
                this.#updateRollCount();
                // Animate dice and show result
                this.#diceAnimation(dieValues);
                break;
            case "postRoll":
                // --- Called when roll animation has completed ---
                this.#enableCommit(); // Allow selection of score categories.
                if (this.#ctrl.getRollsRemaining() > 0) {
                    this.#enableRollBtn();
                }
                this.#updateCategories(); // Update unused score categories.
                break;
            case "postCommitCategory":
                // *** TEST ***
                if (0) {
                    this.setGuiState("gameOver");
                    break;
                }
                // ************
                // --- Called after selection of category has been dispatched to controller ---
                // Check if there's any unused score categories left
                if (!this.#ctrl.isUnusedCategories()) {
                    // All categories have been used, so game over.
                    this.setGuiState("gameOver");
                    break;
                }
                this.#disableCommit(); // Prevent selection of score categories.
                this.#ctrl.resetRollCount();
                this.#updateRollCount();
                this.#clearUnusedCategories(); // Remove score value in fields for all unsued categories.
                this.#updateResults(); // Update sum, bonus and total fields.
                this.#enableRollBtn();
                this.#resetDice();
                break;
            case "gameOver":
                // --- Called after last reamining score category has been selected ---
                this.#disableCommit(); // Prevent selection of score categories.
                this.#updateResults(); // Update sum, bonus and total fields.
                this.#resetDice();
                // --- Game over modal prompt ---
                this.#displayGameOverPrompt();
                break;
            default:
                throw new Error("Unknown gui state: " + state);
        }
    }

    /**
     * Returns random integer between min and max (inclusive).
     * @param min   int
     * @param max   int
     */
    static #getRandomInt(min, max) {
        return Math.floor(Math.random() * ((max - min) + 1)) + min;
    }

    /**
     * Resolves all ids in this.#elms
     * @param   elms    Obj map.
     * @throws  Error on unknown DOM id
     */
    #resolveElmIds(elms) {
        for (let id in elms) {
            if (elms[id] !== null) {
                // Recursive callback.
                this.#resolveElmIds(elms[id]);
            } else {
                // Resolve id
                elms[id] = document.getElementById(id);
                if (elms[id] === null) {
                    throw new Error("Unable to resolve DOM id: " + id);
                }
            }
        }
    }

    #attachListeners() {
        // --- Keyboard ---
        // document.addEventListener("keydown", (e) => this.#keydownListener(e));

        // --- Dice ---
        for (let id in this.#elms["dice"]) {
            this.#elms["dice"][id].addEventListener("click", (e) => this.#dieHoldListener(e));
            this.#elms["dice"][id].addEventListener("transitionend", (e) => this.#dieTransitionendListener(e));
        }

        // --- Roll control ---
        this.#elms["btnRoll"].addEventListener("click", (e) => this.#btnRollListener(e));

        // --- Score container ---
        // Used for detecting clicks on category labels and category input elements.
        this.#elms.scoreContainer.addEventListener("click", (e) => this.#scoreContainerListener(e));

        // --- Score category input elements ---
        for (let id in this.#elms["categories"]) {
            // -- Prevent auto-selection of text on focus by tab --
            this.#elms["categories"][id].addEventListener("focus", (e) => {
                e.target.setSelectionRange(0, 0);
                // Delay is necessary in Firefox.
                setTimeout(() => e.target.setSelectionRange(0, 0), 0);
            });
        }

        // --- Game Over prompt ---
        this.#elms["guiOverlay"].addEventListener("transitionend", (e) => this.#gameOverTransitionendListener(e));
        this.#elms["gameOverPrompt"]["mp_container"].addEventListener("transitionend",
            (e) => this.#gameOverTransitionendListener(e));
        // Button
        this.#elms["gameOverPrompt"]["mp_btnPlayAgain"].addEventListener("click", () => this.#btnListnerPlayAgain());
    }

    /**
     * Resets styling of categories and associated labels.
     */
    #resetCategories() {
        // --- Score categories and labels ---
        for (let id in this.#elms["categories"]) {
            // Input element
            let inpElm = this.#elms["categories"][id];
            inpElm.classList.remove("committed");
            // Label (div) element for category
            let divElm = document.querySelector("[data-category='" + inpElm.id + "'");
            if (divElm !== null) {
                divElm.classList.remove("committed");
            }
        }
    }

    /**
     * Removes all hold states and set die faces to non-value.
     */
    #resetDice() {
        for (let id in this.#elms["dice"]) {
            let dieElm = this.#elms["dice"][id];
            dieElm.src = this.#dieImageDir + this.#dieImages[0]; // Question mark image.
            let dieNum = this.#dieElm2Number(dieElm);
            this.#releaseHold(dieNum);
            // this.#dieIdleTransition(dieElm);
        }
    }

// *** Dice section ***************************************************************************************************

    /**
     * Engages or realeases hold on die.
     * @param e     event
     */
    #dieHoldListener(e) {
        if (this.#ctrl.getRollCount() === 0) return; // Ignore hold request before first roll.
        let dieElm = e.target;
        let dieNum = this.#dieElm2Number(dieElm);
        if (this.#ctrl.isHold(dieNum)) {
            this.#releaseHold(dieNum);
        } else {
            this.#engageHold(dieNum);
        }
        // Check if all dice are set to hold.
        if (this.#ctrl.isHoldAll()) {
            // Prevent rollAction if all dice are set to hold.
            this.#disableRollBtn();
        } else if (this.#ctrl.getRollsRemaining() !== 0) {
            // Allow rollAction except if all rolls have been used.
            this.#enableRollBtn();
        }
    }

    /**
     * Engages hold on die.
     * @param dieNum
     */
    #engageHold(dieNum) {
        this.#ctrl.setHold(dieNum);
        let dieElm = this.#dieNumber2Elm(dieNum);
        let dieWrapper = dieElm.parentElement;
        dieElm.style.opacity = "0.75";
        dieWrapper.classList.add("hold");
    }

    /**
     * Releases hold on die.
     * @param dieNum
     */
    #releaseHold(dieNum) {
        if (this.#ctrl !== null) this.#ctrl.releaseHold(dieNum);
        let dieElm = this.#dieNumber2Elm(dieNum);
        let dieWrapper = dieElm.parentElement;
        dieWrapper.classList.remove("hold");
        dieElm.style.opacity = "1";
    }

    /**
     * Returns die number for passed dieElm.
     * @param dieElm
     * @returns {number}    Range: 1 - 5.
     */
    #dieElm2Number(dieElm) {
        let dieNumber = this.#dieOrder.indexOf(dieElm.id) + 1;
        if (dieNumber === 0) {
            throw new Error("Unable to resolve dieId to dieNumber. Die elm id: " + dieElm.id);
        }
        return dieNumber;
    }

    /**
     * @param dieNumber     The die number to resolve to die element. Range: 1 - 5.
     * @returns {*}
     */
    #dieNumber2Elm(dieNumber) {
        let dieId = this.#dieOrder[dieNumber - 1];
        if (typeof (dieId) === "undefined") {
            throw new Error("Unable to resolve dieNumber to dieId. DieNumber: " + dieNumber);
        }
        let dieElm = this.#elms["dice"][dieId];
        if (typeof (dieElm) === "undefined") {
            throw new Error("Unable to resolve dieId to element. DieId: " + dieId);
        }
        return dieElm;
    }

    // *** Die Animations ***************************************************************

    #idleAnimation() {
        for (let id in this.#elms["dice"]) {
            this.#dieIdleTransition(this.#elms["dice"][id]);
        }
    }

    #dieIdleTransition(dieElm) {
        dieElm.style.transitionDuration = View.#getRandomInt(2500, 5000) + "ms";
        dieElm.style.transitionDelay = View.#getRandomInt(2500, 10000) + "ms";
        dieElm.style.transitionTimingFunction = "ease-in-out";
        dieElm.style.transitionProperty = "transform";
        let degrees = 360;
        degrees *= View.#getRandomInt(0, 1) ? 1 : -1;
        dieElm.style.transform = "rotate(" + degrees + "deg)";
        dieElm.dataset.state = "transIdle";
    }

    /**
     * Performs roll animation for all dice.
     * When animation is done, die faces will show values passed in array.
     * @param dieValues     Array(5). Expected to hold ints in range:
     */
    #diceAnimation(dieValues) {
        // Clear sync array (used by #dieTransition() and #dieTransitionendListener()).
        this.#diceTransitionSync.splice(0, this.#diceTransitionSync.length);
        // Transition out.
        let delay = this.#diceTransitionParams["out"]["delay"];
        let delayInc = this.#diceTransitionParams["out"]["delayInc"];
        for (let i = 0; i < dieValues.length; i++) {
            // Only animate dice that are not set to hold.
            if (!this.#ctrl.isHold(i + 1)) {
                this.#dieTransitionOut(i + 1, dieValues[i], delay);
                delay += delayInc;
            }
        }
    }

    /**
     * Starts transitionOut-part of roll animation.
     * @param dieNumber         int The dice to animate. Range: 1 - 5.
     * @param result            int The result (face) to show at end of animation. Range: 1 - 6.
     * @param delay             int Delay in ms before starting animation.
     */
    #dieTransitionOut(dieNumber, result, delay) {
        // --- Resolve dieNumber to dieElm ---
        let dieElm = this.#dieNumber2Elm(dieNumber);
        // Add dieElm to sync array.
        // Used bu transitionEnd to determinde when all animations are completed.
        this.#diceTransitionSync.push(dieElm);
        // --- Resolve result to image filename ---
        let resultFilename = this.#dieImages[result];
        if (typeof (resultFilename) === "undefined") {
            throw new Error("Unable to resolve result to image filename. Result: " + result);
        }
        dieElm.dataset.cuedSrc = resultFilename;
        dieElm.dataset.state = "transOut";
        // Set transition parameters
        dieElm.style.transitionDuration = this.#diceTransitionParams["out"]["duration"] + "ms";
        dieElm.style.transitionDelay = delay + "ms";
        dieElm.style.transitionTimingFunction = "ease-in, ease, ease";
        dieElm.style.transitionProperty = "opacity, max-height, transform";
        // Commence transition-out
        dieElm.style.opacity = "0";
        dieElm.style.maxHeight = "15%"; // We only need to change height, as dice maintain aspect ratio.
        dieElm.style.transform = "rotate(" + (View.#getRandomInt(45, 135) * -1) + "deg)";

        // Note:
        // dieTransitionendListener is triggered at end of transition.
    }

    /**
     * Starts transitionOut-part of roll animation.
     * @param dieNumber         int The dice to animate. Range: 1 - 5.
     */
    #dieTransitionIn(dieNumber) {
        // --- Resolve dieNumber to dieElm ---
        let dieElm = this.#dieNumber2Elm(dieNumber);
        let delay = this.#diceTransitionParams["in"]["delay"];
        let index = this.#diceTransitionSync.indexOf(dieElm);
        if (index === -1) {
            throw new Error("Unable to locate dieElm in diceTransitionSync array. Elm id: " + dieElm.id);
        }
        delay += this.#diceTransitionParams["in"]["delayInc"] * (index + 1);
        setTimeout(() => {
            dieElm.dataset.state = "transIn";
            dieElm.style.transitionDuration = this.#diceTransitionParams["in"]["duration"] + "ms";
            dieElm.style.transitionDelay = delay + "ms";
            dieElm.style.transitionTimingFunction = "ease-out, ease, ease-out";
            dieElm.style.transitionProperty = "opacity, max-height, transform";
            dieElm.style.opacity = "1";
            dieElm.style.maxHeight = "100%";
            dieElm.style.transform = "rotate(360deg)";
        }, delay);

        // Note:
        // dieTransitionendListener is triggered at end of transition.
    }

    /**
     * Called on transitionend.
     * Transition out invoked by dieTransition(),
     * @param e     event
     */
    #dieTransitionendListener(e) {
        let dieElm = e.target;
        switch (dieElm.dataset.state) {
            case "normal":
                // Do nothing.
                break;
            case "transOut":
                // Transition out completed for e.target.
                // Set cued die face.
                dieElm.src = this.#dieImageDir + dieElm.dataset.cuedSrc;
                dieElm.style.transitionProperty = "none";
                dieElm.style.transform = "rotate(" + View.#getRandomInt(0, 90) + "deg)";
                this.#dieTransitionIn(this.#dieElm2Number(dieElm));
                break;
            case "transIn":
                dieElm.dataset.state = "normal";
                dieElm.style.transitionProperty = "none";
                dieElm.style.transform = "rotate(0deg)";
                // Remove dieElm from sync array.
                let index = this.#diceTransitionSync.indexOf(dieElm);
                if (index === -1) {
                    throw new Error("Unable to locate dieElm on end of transition. Elm id: " + dieElm.id);
                }
                this.#diceTransitionSync.splice(index, 1);
                // Check if all die transitions have completed.
                if (this.#diceTransitionSync.length === 0) {
                    this.setGuiState("postRoll");
                }
                break;
            case "transIdle":
                dieElm.style.transitionProperty = "none";
                dieElm.style.transform = "rotate(0deg)";
                // Loop idleTransition as long as data-state = "transIdle".
                setTimeout(() => this.#dieIdleTransition(dieElm), 0);
                break;
            default:
                throw new Error("Unknown data-state value: " + dieElm.dataset.state);
        }
    }

    // *** Roll control section ****************************************************************************************

    #btnRollListener(e) {
        this.setGuiState("roll");
    }

    #enableRollBtn() {
        this.#elms["btnRoll"].disabled = false;
    }

    #disableRollBtn() {
        this.#elms["btnRoll"].disabled = true;
    }

    #updateRollCount() {
        this.#elms["rollsRemaining"].innerHTML = this.#ctrl.getRollCount();
    }

    // *** Score Section **********************************************************************************************

    #updateCategories() {
        let categoryScores = this.#ctrl.getScores();
        for (let [key, value] of Object.entries(categoryScores)) {
            let inpElm = this.#elms["categories"][key]; // Retrieve input element for category.
            if (inpElm === null) {
                throw new Error("Unknown category: " + key);
            }
            // We only update non-committed input elements.
            if (!inpElm.classList.contains("committed")) {
                inpElm.value = value;
            }
        }
    }

    #clearUnusedCategories() {
        for (let id in this.#elms["categories"]) {
            if (!this.#elms["categories"][id].classList.contains("committed")) {
                this.#elms["categories"][id].value = "";
            }
        }
    }

    #updateResults() {
        this.#elms["results"]["upperSectionSum"].value = this.#ctrl.getUpperSectionSum();
        this.#elms["results"]["bonus"].value = this.#ctrl.getBonus();
        this.#elms["results"]["lowerSectionSum"].value = this.#ctrl.getLowerSectionSum();
        this.#elms["results"]["total"].value = this.#ctrl.getTotal();
    }

    /**
     * Enables hover styling for any non-committed categories,
     */
    #enableHover() {
        for (let [id, inpElm] of Object.entries(this.#elms["categories"])) {
            if (!inpElm.classList.contains("committed")) {
                inpElm.classList.add("hover");
                let divElm = document.querySelector('[data-category="' + inpElm.id + '"]');
                divElm.classList.add("hover");
            }
        }
    }

    /**
     * Disables hover styling for all categories.
     */
    #disableHover() {
        for (let [id, inpElm] of Object.entries(this.#elms["categories"])) {
            inpElm.classList.remove("hover");
            let divElm = document.querySelector('[data-category="' + inpElm.id + '"]');
            divElm.classList.remove("hover");
        }
    }

    /**
     * Invoked on click of pointsContainer.
     * @param e
     */
    #scoreContainerListener(e) {
        if (this.#blockCommit) return; // Commit action is blocked. Bail out.
        let inpElm = null;
        let divElm = null;
        if (e.target.classList.contains("selectable")) {
            // Score element
            inpElm = e.target;
            // Retrieve corresponding div element holding category label
            divElm = document.querySelector('[data-category="' + inpElm.id + '"]');
            if (divElm === null) {
                throw new Error("Unable to retrieve label element by data-category using id: " + inpElm.id);
            }
        } else if (typeof (e.target.dataset.category) !== "undefined") {
            // Div element holding category label.
            divElm = e.target;
            let category = e.target.dataset.category;
            // Retrieve corresponding input element.
            inpElm = this.#elms["categories"][category];
            if (typeof (inpElm) === "undefined") {
                throw new Error("Unable to retrieve input element by data-category: " + category);
            }
        }
        // Check if listener was invoked by a valid, non-committed, score category.
        if (inpElm !== null && !e.target.classList.contains("committed")) {
            this.#commitCategory(inpElm, divElm);
        }
    }

    /**
     * Commits passed category as result for current round.
     * @param inpElm    Input element for category.
     * @param divElm    Div element holding label for category.
     */
    #commitCategory(inpElm, divElm) {
        inpElm.classList.add("committed");
        divElm.classList.add("committed");
        // Commit selection
        this.#ctrl.commitCategory(inpElm.id, Number(inpElm.value));
        this.setGuiState("postCommitCategory");
    }

    /**
     * Enables commit action for all non-committed categories.
     */
    #enableCommit() {
        this.#blockCommit = false;
        this.#enableHover();
    }

    /**
     * Disables committ actino for all categories.
     */
    #disableCommit() {
        this.#blockCommit = true;
        this.#disableHover();
    }

    // *** Game over pop-up ********************************************************************************************

    #displayGameOverPrompt() {
        this.#saveDocBodyScroll();
        // Display pageOverlay to prevent click on game gui,
        this.#elms["pageOverlay"].style.display = "block";
        // Display guiOverlay to darken game gui,
        this.#elms["guiOverlay"].style.display = "block";
        // --- Modal prompt ---
        // Display modal prompt.
        this.#elms["gameOverPrompt"]["mp_outerWrapper"].style.display = "grid";
        // --- Prepare transitions ---
        this.#elms["guiOverlay"].dataset.state = "transIn";
        this.#elms["gameOverPrompt"]["mp_container"].dataset.state = "transIn";
        this.#elms["gameOverPrompt"]["mp_container"].style.transitionDuration = "1000ms";
        // Clear and populate sync array
        this.#gameOverTransitionSync.splice(0, this.#gameOverTransitionSync.length);
        this.#gameOverTransitionSync.push(this.#elms["guiOverlay"]);
        this.#gameOverTransitionSync.push(this.#elms["gameOverPrompt"]["mp_container"]);
        // Commence transitions.
        setTimeout(() => {
            this.#elms["guiOverlay"].style.opacity = "0.75";
            this.#elms["gameOverPrompt"]["mp_container"].style.opacity = "1"
            this.#elms["gameOverPrompt"]["mp_header"].style.letterSpacing = "10px";
            this.#elms["pageOverlay"].style.opacity = "0";
        }, 0);
        // Display total score.
        this.#displatTotalScore();
    }

    /**
     * Called at tranisitionend for mp_container and guiOverlay.
     * @param e
     */
    #gameOverTransitionendListener(e) {
        if (typeof (e.target.dataset.state) === "undefined") return; // bail out.
        let elm = e.target;
        // Remove elm from sync array.
        let index = this.#gameOverTransitionSync.indexOf(elm);
        if (index === -1) {
            throw new Error("Unable to locate elm in transSync array. Elm id: " + elm.id);
        }
        this.#gameOverTransitionSync.splice(index, 1);
        // Check if transitions have completed.
        if (this.#gameOverTransitionSync.length !== 0) {
            // Not yet... bail out.
            return;
        }
        // --- Transitions completed ---
        switch (elm.dataset.state) {
            case "transIn":
                // Do nothing.
                break;
            case "transOut":
                elm.dataset.state = "hidden";
                this.#elms["pageOverlay"].style.display = "none";
                this.#elms["gameOverPrompt"]["mp_outerWrapper"].style.display = "none";
                this.#elms["guiOverlay"].style.display = "none";
                // Start new game.
                this.setGuiState("newGame");
                break;
            default:
                throw new Error("Unknown data-state value: " + elm.dataset.state);
        }
    }

    #displatTotalScore() {
        let total = this.#ctrl.getTotal();
        // total = 1759;
        let digits = total.toString().split("");
        if (digits.length > 4) {
            throw new Error("OutOfBounds. Max score can not exeed four digits.");
        }
        // Pad with leading "nulls" until length of 4
        while (digits.length < 4) {
            digits.unshift(null);
        }
        // Set gui to display needed digits as zeroes.
        digits.forEach((value, i) => {
            if (value !== null) {
                this.#elms["gameOverPrompt"]["mp_totalDigit_" + (i + 1)].innerHTML = "0";
            }
        })
        // Init count up per digit
        setTimeout(() => {
            let delay = 0;
            for (let i = digits.length - 1; i >= 0; i--) {
                setTimeout(() => {
                    let tmp = 0;
                    let intervalId = setInterval(() => {
                        if (tmp < digits[i]) {
                            this.#elms["gameOverPrompt"]["mp_totalDigit_" + (i + 1)].innerHTML = ++tmp;
                        } else {
                            clearInterval(intervalId);
                        }
                    }, 50);
                }, delay);
                delay += 200;
            }
        }, 750);
    }

    #hideGameOverModalPrompt() {
        this.#restoreDocBodyScroll();
        // --- Prepare transitions ---
        this.#elms["guiOverlay"].dataset.state = "transOut";
        this.#elms["gameOverPrompt"]["mp_container"].dataset.state = "transOut";
        this.#elms["gameOverPrompt"]["mp_container"].style.transitionDuration = "500ms";
        // Clear and populate sync array
        this.#gameOverTransitionSync.splice(0, this.#gameOverTransitionSync.length);
        this.#gameOverTransitionSync.push(this.#elms["guiOverlay"]);
        this.#gameOverTransitionSync.push(this.#elms["gameOverPrompt"]["mp_container"]);
        // Commence transitions.
        setTimeout(() => {
            this.#elms["guiOverlay"].style.opacity = "0";
            this.#elms["gameOverPrompt"]["mp_container"].style.opacity = "0"
            this.#elms["gameOverPrompt"]["mp_header"].style.letterSpacing = "350px";
            this.#elms["pageOverlay"].style.opacity = "0";
        }, 0);
    }

    #btnListnerPlayAgain() {
        this.#hideGameOverModalPrompt();
    }

    #saveDocBodyScroll() {
        // --- Body ---
        // Check if horizontal scrollbars are displayed.
        if (document.documentElement.scrollWidth > document.documentElement.offsetWidth) {
            document.body.style.overflowX = "scroll";
        }
        // Check if vertical scrollbars are displayed.
        if (document.documentElement.scrollHeight > document.documentElement.offsetHeight) {
            document.body.style.overflowY = "scroll";
        }
        // Save current doc body scoll positions.
        this.#windowScrollPos[0] = window.scrollX;
        this.#windowScrollPos[1] = window.scrollY;
        this.#elms["pageWrapper"].style.position = "fixed";
        this.#elms["pageWrapper"].style.left = (this.#windowScrollPos[0] * -1) + "px";
        this.#elms["pageWrapper"].style.top = (this.#windowScrollPos[1] * -1) + "px";
        window.scroll(0, 0); // Ensure modal prompt is in viewport.
        // Reset modal prompt left/top
        this.#elms["gameOverPrompt"]["mp_innerWrapper"].style.left = "0px";
        this.#elms["gameOverPrompt"]["mp_innerWrapper"].style.top = "0px";
    }

    #restoreDocBodyScroll() {
        // Save current doc body scoll positions.
        let scrollX = window.scrollX;
        let scrollY = window.scrollY;
        // Let overflow be controlled by pageWrapper
        this.#elms["pageWrapper"].style.position = "static";
        // Restore doc body overflow settings
        document.body.style.overflowX = "auto";
        document.body.style.overflowY = "auto";
        // Restore saved doc body scroll position.
        window.scroll(this.#windowScrollPos[0], this.#windowScrollPos[1]);
        // Ensure modal prompt keeps position
        scrollX -= this.#windowScrollPos[0];
        scrollY -= this.#windowScrollPos[1];
        this.#elms["gameOverPrompt"]["mp_innerWrapper"].style.left = (scrollX * -1) + "px";
        this.#elms["gameOverPrompt"]["mp_innerWrapper"].style.top = (scrollY * -1) + "px";
    }
}