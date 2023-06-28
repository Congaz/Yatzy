import {Model} from "./Model.js";
import {View} from "./View.js";

export class Controller
{
    #model;
    #view;

    constructor(model, view) {
        if (!model instanceof Model) throw new Error("TypeMismatch. Instance of class Model expeted.");
        if (!view instanceof View) throw new Error("TypeMismatch. Instance of class View expeted.");
        this.#model = model;
        this.#view = view;
        view.attachController(this);
        view.setGuiState("newGame");
    }

    reset() {
        this.#model.reset();
    }

    // *** Roll methods ***********************************************************************************************

    getRollsRemaining()
    {
        return this.#model.getRollsRemaining();
    }

    getRollCount() {
        return this.#model.getRollCount();
    }

    resetRollCount() {
        this.#model.resetRollCount();
    }

    roll() {
        return this.#model.roll();
    }

    // *** Die methods ************************************************************************************************

    /**
     * Returns hold state for passed die number.
     * @param dieNumber     Range: 1 - 5.
     * @returns boolean
     */
    isHold(dieNumber) {
        return this.#model.isHold(dieNumber);
    }

    /**
     * Returns true if all dice are set to hold.
     * @returns {boolean}
     */
    isHoldAll() {
        return this.#model.isHoldAll();
    }

    /**
     * @param dieNum    The die number which to hold. Range: 1 - 6.
     */
    setHold(dieNum) {
        this.#model.setHold(dieNum);
    }

    /**
     * @param dieNum    The die number which to hold. Range: 1 - 6.
     */
    releaseHold(dieNum) {
        this.#model.releaseHold(dieNum);
    }

    // *** Score methods **********************************************************************************************

    commitCategory(name, score) {
        this.#model.commitCategory(name, score);
    }

    isUnusedCategories() {
        return this.#model.isUnusedCategories();
    }

    getScores() {
        return this.#model.getScores();
    }

    getUpperSectionSum() {
        return this.#model.getUpperSectionSum();
    }

    getBonus() {
        return this.#model.getBonus();
    }

    getLowerSectionSum() {
        return this.#model.getLowerSectionSum();
    }

    getTotal() {
        return this.#model.getTotal();
    }


}