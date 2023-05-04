"use strict";

class Model
{
    #NUM_OF_DICE
    #NUM_OF_SIDES
    #MAX_NUM_ROLLS
    #YAHTZEE_SCORE_INCLUDES_FACES
    #YAHTZEE_SCORE
    #MIN_UPPER_SCORE_FOR_BONUS
    #BONUS_SCORE
    #rollCount
    #dieValues
    #dieHolds
    #faceFreq
    #scores = {
          categories : {
            upperSection : {
                ones : {value : 0, available : true},
                twos: {value : 0, available : true},
                threes: {value : 0, available : true},
                fours: {value : 0, available : true},
                fives: {value : 0, available : true},
                sixes: {value : 0, available : true},
            },
          lowerSection : {
              onePair: {value : 0, available : true},
              twoPairs: {value : 0, available : true},
              threeOfAKind: {value : 0, available : true},
              fourOfAKind: {value : 0, available : true},
              fullHouse: {value : 0, available : true},
              smallStraight: {value : 0, available : true},
              largeStraight: {value : 0, available : true},
              chance: {value : 0, available : true},
              yahtzee: {value : 0, available : true},
          }
        },
        results : {
            // Upper section
            upperSectionSum : 0,
            bonus : 0,
            // Lower section
            lowerSectionSum : 0,
            total : 0
        },
        highScore : 0
    }

    constructor() {
        // --- Constants --------------------------------
        // Num of dice in game.
        this.#NUM_OF_DICE = 5;
        // Num of sides of dice
        this.#NUM_OF_SIDES = 6;
        // Max. num of rolls pr. round
        this.#MAX_NUM_ROLLS = 3;
        // Defines if score of yahtzee includes the rolled faces
        this.#YAHTZEE_SCORE_INCLUDES_FACES = false;
        // Defines min. score (see above) for rolling Yahtzee
        this.#YAHTZEE_SCORE = 50;
        // Defines min. score in upper section for recieving bonus
        this.#MIN_UPPER_SCORE_FOR_BONUS = 63;
        // Defines bonus points for upper section
        this.#BONUS_SCORE = 50;
        // ----------------------------------------------
        // Result (die faces) of last roll. Index 0: die 1 / Index 1: die 2 etc. Value range: 0 (no value)|1-6.
        this.#dieValues = new Array(this.#NUM_OF_DICE);
        // Hold state pr. die. Options: true|false.
        this.#dieHolds = new Array(this.#NUM_OF_DICE);
        // Freqency of face values in last roll. Index 0: num of 1's / Index 1: num of 2's etc.
        this.#faceFreq = new Array(this.#NUM_OF_SIDES);
        // Init values
        this.reset();
    }

    /**
     * Resets game level params, so a new game can by played.
     */
    reset() {
        this.resetRollCount();
        this.#dieValues.fill(0);
        this.#dieHolds.fill(false);
        this.#faceFreq.fill(0);
        this.#resetScores(this.#scores);
    }

    resetRollCount() {
        this.#rollCount = 0;
    }

    /**
     * Resets all scores except highScore.
     * @param   scores    Obj map.
     */
    #resetScores(scores) {
        for (let id in scores) {
            if (typeof(scores[id]) !== "number" && typeof(scores[id]) !== "boolean") {
                // Recursive callback until we find a number or a boolean.
                this.#resetScores(scores[id]);
            } else if (id !== "highScore") {
                // Reset score (except highScore).
                if (id === "available") {
                    scores[id] = true;
                } else {
                    scores[id] = 0;
                }
            }
        }
    }

    /**
     * Returns random integer between min and max (inclusive).
     * @param min   pos. int
     * @param max   pos. int
     */
    static #getRandomInt(min, max) {
        return Math.floor(Math.random() * ((max - min) + 1)) + min;
    }

    // *** Roll methods ***********************************************************************************************

    getRollsRemaining()
    {
        return this.#MAX_NUM_ROLLS - this.#rollCount;
    }

    getRollCount() {
        return this.#rollCount;
    }

    /**
     * Perform roll.
     * @returns array(5)
     */
    roll() {
        if (this.#rollCount >= this.#MAX_NUM_ROLLS) {
            throw new Error("IllegalAction. Num of max. rolls can't be exeeded.");
        }
        if (!this.isUnusedCategories()) {
            throw new Error("IllegalAction. Roll is prohibited when no score categories are unused.");
        }
        this.#rollCount++;
        for (let i = 0; i < this.#dieValues.length; i++) {
            // Only roll dice that aren't set to hold.
            if (!this.#dieHolds[i]) {
                this.#dieValues[i] = Model.#getRandomInt(1, 6);
            }
        }
        this.#calcFreq(); // Updates this.#faceFreq.
        return this.#dieValues;
    }

    // *** Die hold methods ******************************************************************************************

    /**
     * Returns hold state for passed die number.
     * @param dieNumber     Range: 1 - 5.
     * @returns boolean
     */
    isHold(dieNumber) {
        return this.#dieHolds[dieNumber - 1];
    }

    /**
     * Returns true if all dice are set to hold.
     * @returns {boolean}
     */
    isHoldAll() {
        return this.#dieHolds.indexOf(false) === -1;
    }

    /**
     * @param dieNum    The die number which to hold. Range: 1 - 5.
     */
    setHold(dieNum) {
        if (this.#dieValues[dieNum - 1] === 0) {
            throw new Error("IllegalAction. Die without a face value can not be set to hold.");
        }
        this.#dieHolds[dieNum - 1] = true;
    }

    /**
     * @param dieNum    The die number which to release. Range: 1 - 5.
     */
    releaseHold(dieNum) {
        this.#dieHolds[dieNum - 1] = false;
    }

    // *** Score methods **********************************************************************************************

    /**
     *
     * @param name    Name of category - i.e. "ones", "twos" etc,
     * @param score
     */
    commitCategory(name, score) {
        if (!this.isUnusedCategories()) {
            throw new Error("IllegalAction. No score categories are available.");
        }
        let section = this.#searchSection(name);
        if (typeof(score) !== "number") throw new Error("TypeMismatch. Argument score expected to be of type number");
        // Set score
        this.#scores["categories"][section][name]["value"] = score;
        this.#scores["categories"][section][name]["available"] = false;
        // Add to appripriate upper/lowerSection sum.
        this.#scores["results"][section + "Sum"] += score;
    }

    /**
     * Returns bool signifying if any score category is avaiable.
     */
    isUnusedCategories() {
        let sections = ["upperSection", "lowerSection"];
        for (let section of sections) {
            for (let id in this.#scores.categories[section]) {
                if (this.#scores.categories[section][id]["available"]) {
                    // Stop iteration as at least one category is availble.
                    return true;
                }
            }
        }
        return false;
    }

    getUpperSectionSum() {
        return this.#scores["results"]["upperSectionSum"];
    }

    getBonus() {
        if (this.#scores["results"]["upperSectionSum"] >= this.#MIN_UPPER_SCORE_FOR_BONUS) {
            return this.#BONUS_SCORE;
        }
        return 0;
    }

    getLowerSectionSum() {
        return this.#scores["results"]["lowerSectionSum"];
    }

    getTotal() {
        return this.getUpperSectionSum() + this.getBonus() + this.getLowerSectionSum();
    }

    /**
     * Returns map with results for all categories, using last peformed roll.
     */
    getScores() {
        return {
            // Upper section
            ones : this.#calcSameFaceScore(1),
            twos : this.#calcSameFaceScore(2),
            threes : this.#calcSameFaceScore(3),
            fours : this.#calcSameFaceScore(4),
            fives : this.#calcSameFaceScore(5),
            sixes : this.#calcSameFaceScore(6),
            // Lower section
            onePair : this.#calcHighestScoreByMinNumOfSameFaces(2),
            twoPairs : this.#calcTwoPairs(),
            threeOfAKind : this.#calcHighestScoreByMinNumOfSameFaces(3),
            fourOfAKind : this.#calcHighestScoreByMinNumOfSameFaces(4),
            fullHouse : this.#calcFullHouse(),
            smallStraight : this.#calcSmallStraight(),
            largeStraight : this.#calcLargeStraight(),
            chance : this.#calcChance(),
            yahtzee : this.#calcYahtzee()
        }
    }

    /**
     * Locates and returns section (upper/lower) where category belongs.
     * @param category
     * @return {string}
     */
    #searchSection(category) {
        let sections = ["upperSection", "lowerSection"];
        for (let section of sections) {
            if (typeof(this.#scores["categories"][section][category]) !== "undefined") {
                return section;
            }
        }
        // Category not found.
        throw new Error("Unknown category: " + category);
    }

    /**
     * Updates this.#faceFreq array, based on result from last performed.
     */
    #calcFreq() {
        this.#faceFreq.fill(0);
        for (let i = 0; i < this.#dieValues.length; i++) {
            this.#faceFreq[this.#dieValues[i] - 1]++
        }
    }

    /**
     * Calcs and returns points for passed same-face category.
     * @param face          Range: 1 - 6.
     * @returns {number}
     */
    #calcSameFaceScore(face) {
        if (face < 1 || face > this.#NUM_OF_SIDES) throw new Error("OutOfBounds.");
        return this.#faceFreq[face - 1] * face;
    }

    #calcHighestScoreByMinNumOfSameFaces(numFaces) {
       let map = this.#calcHighestScoreByNumOfSameFacesHelper(numFaces, true, null);
       return map["score"];
    }

     /**
      * @param numFaces int             Min. number of same faces required. Range: 1 - 5.
      * @param minimum  boolean         Defines if numFaces required is a minimum or exact requirement.
      * @param [ignoreFace = null|int]  If passed, this face value will be ignored. Range: 1 - 6.
      * @return object              score : int, faceValue : null|int. The face value that achieved the score.
      */
    #calcHighestScoreByNumOfSameFacesHelper(numFaces, minimum, ignoreFace = null) {
        if (numFaces < 1 || numFaces > this.#NUM_OF_DICE) throw new Error("OutOfBounds.");
        let score = 0;
        let faceValue = null;
        this.#faceFreq.forEach((freq, index) => {
            if ((minimum && numFaces <= freq) || (!minimum && numFaces === freq)) {
                if (ignoreFace === null || ignoreFace !== index + 1) {
                    let tmp = numFaces * (index + 1);
                    if (tmp > score) {
                        score = tmp;
                        faceValue = index + 1; // Save face value of current high score.
                    }
                }
            }
        })
        return {score : score, faceValue : faceValue};
    }

    #calcTwoPairs() {
        let score = 0;
        let highPair = this.#calcHighestScoreByNumOfSameFacesHelper(2, true, null);
        if (highPair["score"] !== 0) {
            // Check for low-pair and ignore dice used for highPair.
            // This will exclude four-of-a-kind to count as two pairs.
            let lowPair = this.#calcHighestScoreByNumOfSameFacesHelper(2, true, highPair["faceValue"]);
            if (lowPair["score"] !== 0) {
                score = highPair["score"] + lowPair["score"];
            }
        }
        return score;
    }

    #calcFullHouse() {
        let score = 0;
        // Check for three-of-a-kind
        let threeObj = this.#calcHighestScoreByNumOfSameFacesHelper(3, false, null);
        if (threeObj["score"] !== 0) {
            // Check for two-of-a-kind excluding dice used for three-of-a-kind.
            let twoObj = this.#calcHighestScoreByNumOfSameFacesHelper(2, false, threeObj["faceValue"]);
            if (twoObj["score"] !== 0) {
                // We have a full house!
                score = threeObj["score"] + twoObj["score"];
            }
        }
        return score;
    }

    #calcSmallStraight() {
        let score = 0;
        // Iterate through freqeuncy for face values 1 - 5.
        for (let i = 0; i < this.#faceFreq.length - 1; i++) {
            if (this.#faceFreq[i] !== 1) return 0; // Straight not achieved. Bail out.
            score += i + 1;
        }
        return score;
    }

    #calcLargeStraight() {
        let score = 0;
        // Iterate through freqeuncy for face values 2 - 6.
        for (let i = 1; i < this.#faceFreq.length; i++) {
            if (this.#faceFreq[i] !== 1) return 0; // Straight not achieved. Bail out.
            score += i + 1;
        }
        return score;
    }

    #calcChance() {
        let score = 0;
        this.#faceFreq.forEach((faceFreq, index) => {
           score += faceFreq * (index + 1);
        });
        return score;
    }

    /**
     * Returns score for Yahtzee category in last performed roll.
     * @return {number}
     */
    #calcYahtzee() {
        let score = this.#calcHighestScoreByMinNumOfSameFaces(5);
        if (score > 0) {
            score = this.#YAHTZEE_SCORE_INCLUDES_FACES ? score + this.#YAHTZEE_SCORE : this.#YAHTZEE_SCORE;
        }
        return score;
    }

}
