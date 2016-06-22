//Simulator for the simulation of the automata
function DFA($scope, $translate) {
    "use strict";
    //selfReference
    //for debug puposes better way for acessing in console?
    window.debugScope = $scope;
    //define scope

    //Default Config for the automaton
    $scope.defaultConfig = {};
    //the default prefix for autonaming for example S0,S1,... after the prefix it saves the id
    $scope.defaultConfig.statePrefix = 'S';
    //Suffix after a transition name on the statediagram
    $scope.defaultConfig.transitionNameSuffix = '|';
    $scope.defaultConfig.diagramm = {
        x: 0,
        y: 0,
        scale: 1,
        updatedWithZoomBehavior: false
    };
    //Number of statesIds given to states
    $scope.defaultConfig.countStateId = 0;
    //Number of transitionIds given to transitions
    $scope.defaultConfig.countTransitionId = 0;
    //The States are saved like {id:stateId,name:"nameoftheState",x:50,y:50}
    $scope.defaultConfig.states = [];
    //Only a number representing the id of the state
    $scope.defaultConfig.startState = null;
    //An array of numbers representing the ids of the finalStates
    $scope.defaultConfig.finalStates = [];
    //the transitions are saved like{fromState:stateId, toState:stateId, name:"transitionName"}
    $scope.defaultConfig.transitions = [];
    //alphabet
    $scope.defaultConfig.alphabet = [];
    //the name of the inputWord
    $scope.defaultConfig.inputWord = '';
    //the default name
    $scope.defaultConfig.name = "Untitled Automaton";
    //if there is something unsaved
    $scope.defaultConfig.unSavedChanges = false;
    //has the drawn Transition
    //{fromState:0,toState:0,names:["a","b"], objReference:};
    //if there is already a transition with the right fromState and toState, thenn only add myname to the names array
    $scope.defaultConfig.drawnTransitions = [];

    //Config Object
    $scope.config = cloneObject($scope.defaultConfig);




    //Array of all update Listeners
    $scope.updateListeners = [];

    //the simulator controlling the simulation
    $scope.simulator = new SimulationDFA($scope);
    // the table where states and transitions are shown
    $scope.table = new TableDFA($scope);
    //the statediagram controlling the svg diagramm
    $scope.statediagram = new StateDiagramDFA($scope, "#diagramm-svg");
    //the statetransitionfunction controlling the statetransitionfunction-table
    $scope.statetransitionfunction = new StatetransitionfunctionDFA($scope);
    //for the testdata
    $scope.testData = new TestData($scope);

    //for the showing/hiding of the Input Field of the automaton name
    $scope.inNameEdit = false;



    /**
     * Add the options to the modal.
     * @param {String} newHeadline Headline of the shown modal.
     * @param {String} newMessage Message of the shown modal. 
     */
    $scope.showModalWithMessage = function (newTitle, newDescription, action, button) {
        $scope.title = newTitle;
        $scope.description = newDescription;
        $scope.modalAction = action;
        if (button === undefined) {
            $scope.button = "MODAL_BUTTON.PROCEED";
        } else {
            $scope.button = button;
        }
        //change it to angular function
        $("#modal").modal();
    };

    /**
     * Executes the modal action-> when clicking on the action button
     */
    $scope.executeModalAction = function () {
        $scope.$eval($scope.modalAction);
    };


    /**
     * Options for the stepTimeOut-Slider
     */
    $scope.stepTimeOutSlider = {
        options: {
            floor: 0,
            step: 100,
            ceil: 3000,
            hideLimitLabels: true,
            translate: function (value) {
                return value + ' ms';
            }
        }
    };

    /**
     * Options for the loopTimeOut-Slider
     */
    $scope.loopTimeOutSlider = {
        options: {
            floor: 0,
            step: 100,
            ceil: 4000,
            hideLimitLabels: true,
            translate: function (value) {
                return value + ' ms';
            }
        }
    };

    /**
     * Leave the input field after clicking the enter button
     */
    $scope.keypressCallback = function ($event) {
        if ($event.charCode == 13) {
            document.getElementById("automatonNameEdit").blur();
        }
    };

    /**
     * Prevent leaving site
     */
    window.onbeforeunload = function (event) {
        //turn true when you want the leaving protection
        if ($scope.config.unSavedChanges) {
            var closemessage = "All Changes will be Lost. Save before continue!";
            if (typeof event == 'undefined') {
                event = window.event;
            }
            if (event) {
                event.returnValue = closemessage;
            }
            return closemessage;

        }
    };

    /**
     * Saves the automata
     */
    $scope.saveAutomaton = function () {
        $scope.config.unSavedChanges = false;

    };

    //from https://coderwall.com/p/ngisma/safe-apply-in-angular-js
    //fix for $apply already in progress
    $scope.safeApply = function (fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn && (typeof (fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };

    /**
     * Removes the current automata and the inputWord
     */
    $scope.resetAutomaton = function () {
        //clear the svgContent
        $scope.statediagram.clearSvgContent();
        $scope.simulator.reset();

        //get the new config
        $scope.config = cloneObject($scope.defaultConfig);
        $scope.safeApply();
        $scope.updateListener();
    };

    /**
     * Adds a char to the input alphabet if the char is not available
     * @param   {value} value the char, which is to be added
     */
    $scope.addToAlphabet = function (value) {
        if (!_.some($scope.config.alphabet, function (a) {
                return a === value;
            })) {
            $scope.config.alphabet.push(value);
        } else {

        }

    };

    /**
     * Removes a char from the alphavet if this char is only used from the given transition
     * @param   {number}  transitionId 
     * @returns {boolean} true if it was removed false if not removed
     */
    $scope.removeFromAlphabetIfNotUsedFromOthers = function (transitionId) {
        var tmpTransition = $scope.getTransitionById(transitionId);
        //search if an other transition use the same name
        var usedByOthers = false;
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            if (tmpTransition.name === $scope.config.transitions[i].name && $scope.config.transitions[i].id !== transitionId) {
                usedByOthers = true;
                return;
            }
        }

        if (!usedByOthers) {
            _.pull($scope.config.alphabet, tmpTransition.name);
            return true;
        } else {
            return false;
        }
    };

    /**
     * This function calls the method updateFunction of every element in $scope.updateListeners
     */
    $scope.updateListener = function () {
        //call each updateListener
        _.forEach($scope.updateListeners, function (value, key) {
            value.updateFunction();
        });
        //after every update we show the user that he has unsaved changes
        $scope.config.unSavedChanges = true;

    };

    //STATE FUNCTIONS START

    /**
     * Checks if a state exists with the given name
     * @param  {String}  stateName       
     * @param {Int} stateID optionally dont check with this stateid
     * @return {Boolean} 
     */
    $scope.existsStateWithName = function (stateName, stateID) {
        var tmp = false;
        _.forEach($scope.config.states, function (state) {
            if (state.name == stateName && state.id !== stateID) {
                tmp = true;
                return;
            }
        });
        return tmp;
    };

    /**
     * Checks if a state exists with the given id
     * @param  {Id} stateId 
     * @return {Boolean}           
     */
    $scope.existsStateWithId = function (stateId) {
        for (var i = 0; i < $scope.config.states.length; i++) {
            if ($scope.config.states[i].id == stateId)
                return true;
        }
        return false;
    };

    /**
     * returns if the node has transitions
     * @param  {number}  stateId 
     * @return {Boolean}         
     */
    $scope.hasStateTransitions = function (stateId) {
        var tmp = false;
        _.forEach($scope.config.transitions, function (transition) {
            if (transition.fromState == stateId || transition.toState == stateId) {
                tmp = true;
            }
        });
        return tmp;
    };

    /**
     * Get the array index from the state with the given stateId
     * @param  {number} stateId 
     * @return {number}         Returns the index and -1 when state with stateId not found
     */
    $scope.getArrayStateIdByStateId = function (stateId) {
        return _.findIndex($scope.config.states, function (state) {
            if (state.id == stateId) {
                return state;
            }
        });
    };

    /**
     * Returns the State with the given stateId
     * @param  {number} stateId 
     * @return {object}        Returns the objectreference of the state undefined if not found
     */
    $scope.getStateById = function (stateId) {

        return $scope.config.states[$scope.getArrayStateIdByStateId(stateId)];
    };

    /**
     * Returns the State with the given stateName
     * @param  {number} stateId 
     * @return {object}        Returns the objectreference of the state undefined if not found
     */
    $scope.getStateByName = function (stateName) {

        return $scope.config.states[$scope.getArrayStateIdByStateId(function (stateName) {

        })];
    };
    /**
     * Add a state with default name
     * @param {number} x 
     * @param {number} y 
     * @returns {object} the created object
     */
    $scope.addStateWithPresets = function (x, y) {
        var obj = $scope.addState(($scope.config.statePrefix + $scope.config.countStateId), x, y);
        //if u created a state then make the first state as startState ( default)
        if ($scope.config.countStateId == 1) {
            $scope.changeStartState(0);
        }
        return obj;
    };

    /**
     * Adds a state at the end of the states array
     * @param {String} stateName 
     * @param {number} x         
     * @param {number} y         
     * @returns {object} the created object
     */
    $scope.addState = function (stateName, x, y) {
        if (!$scope.existsStateWithName(stateName)) {
            return $scope.addStateWithId($scope.config.countStateId++, stateName, x, y);
        } else {
            //TODO: BETTER DEBUG  
            return null;
        }
    };

    /**
     * Adds a state at the end of the states array with a variable id
     * !!!dont use at other places!!!!
     * @param {String} stateName 
     * @param {number} x         
     * @param {number} y   
     * @returns {object} the created object
     */
    $scope.addStateWithId = function (stateId, stateName, x, y) {
        var addedStateId = $scope.config.states.push(new State(stateId, stateName, x, y));
        //draw the State after the State is added
        $scope.statediagram.drawState(stateId);
        $scope.updateListener();
        //fix changes wont update after addTransisiton from the statediagram
        $scope.safeApply();
        return $scope.getStateById(stateId);
    };

    /**
     * Removes the state with the given id
     * @param  {number} stateId 
     */
    $scope.removeState = function (stateId) {
        if ($scope.hasStateTransitions(stateId)) {
            //TODO: BETTER DEBUG
            $scope.showModalWithMessage('STATE_MENU.DELETE_MODAL_TITLE', 'STATE_MENU.DELETE_MODAL_DESC', 'forcedRemoveState(' + stateId + ')', 'MODAL_BUTTON.DELETE');
        } else {
            //if the state is a final state move this state from the final states
            if ($scope.isStateAFinalState(stateId)) {
                $scope.removeFinalState(stateId);
            }
            //if state is a start State remove the state from the startState
            if ($scope.config.startState == stateId) {
                $scope.config.startState = null;
            }
            //first remove the element from the svg after that remove it from the array
            $scope.statediagram.removeState(stateId);
            $scope.config.states.splice($scope.getArrayStateIdByStateId(stateId), 1);
            //update the other listeners when remove is finished
            $scope.updateListener();
        }
    };

    $scope.forcedRemoveState = function (stateId) {
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var tmpTransition = $scope.config.transitions[i];
            if (tmpTransition.fromState === stateId || tmpTransition.toState === stateId) {
                $scope.removeTransition(tmpTransition.id);
                i--;
            }
        }
        $scope.removeState(stateId);
    };

    /**
     * Rename a state if the newStatename isnt already used
     * @param  {number}  stateId      
     * @param  {State}   newStateName 
     * @returns {boolean} true if success false if no succes
     */
    $scope.renameState = function (stateId, newStateName) {
        if ($scope.existsStateWithName(newStateName)) {
            //TODO: BETTER DEBUG
            return false;
        } else {
            $scope.getStateById(stateId).name = newStateName;
            //Rename the state on the statediagram
            $scope.statediagram.renameState(stateId, newStateName);
            $scope.updateListener();
            return true;
        }
    };

    /**
     * Changes the start state to the given state id
     */
    $scope.changeStartState = function (stateId) {
        if ($scope.existsStateWithId(stateId)) {
            //change on statediagram and others
            $scope.statediagram.changeStartState(stateId);
            //change the startState then
            $scope.config.startState = stateId;

            //update the listeners after the startState is set
            $scope.updateListener();
        } else {
            //TODO: BETTER DEBUG
        }
    };

    /**
     * Removes the start state 
     */
    $scope.removeStartState = function () {
        //TODO What is dis
        if ($scope.config.startState !== null) {
            //change on statediagram and others
            $scope.statediagram.removeStartState();
            $scope.updateListener();
            //change the startState
            $scope.config.startState = null;
        }

    };

    /**
     * Returns the Index of the saved FinalState
     * @param  {number} stateId 
     * @return {number}
     */
    $scope.getFinalStateIndexByStateId = function (stateId) {
        return _.indexOf($scope.config.finalStates, stateId);
    };

    /**
     * Returns if the state is a finalState
     * @param  {number} stateId 
     * @return {Boolean}         
     */
    $scope.isStateAFinalState = function (stateId) {
        for (var i = 0; i < $scope.config.finalStates.length; i++) {
            if ($scope.config.finalStates[i] == stateId)
                return true;
        }
        return false;
    };

    /**
     * Add a state as final State if it isnt already added and if their is a state with such a id
     */
    $scope.addFinalState = function (stateId) {
        if (!$scope.isStateAFinalState(stateId)) {
            $scope.config.finalStates.push(stateId);
            //add to the statediagram
            $scope.statediagram.addFinalState(stateId);
            $scope.updateListener();
        } else {
            //TODO: BETTER DEBUG
        }
    };

    /**
     * Remove a state from the final states
     * @return {[type]} [description]
     */
    $scope.removeFinalState = function (stateId) {
        if ($scope.isStateAFinalState(stateId)) {
            //remove from statediagram
            $scope.statediagram.removeFinalState(stateId);
            $scope.updateListener();
            $scope.config.finalStates.splice($scope.getFinalStateIndexByStateId(stateId), 1);
        } else {
            //TODO: Better DBUG
        }
    };

    //TRANSITIONS

    /**
     * Checks if a transition with the params already exists
     * @param  {number}  fromState      Id of the fromstate
     * @param  {number}  toState        id from the toState
     * @param  {Strin}  transitonName The name of the transition
     * @return {Boolean}                
     */
    $scope.existsTransition = function (fromState, toState, transitonName, transitionId) {
        var tmp = false;
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var transition = $scope.config.transitions[i];
            //NFA == if (transition.fromState == fromState && transition.name == transitonName && transition.id !== transitionId) {
            if (transition.fromState == fromState && transition.name == transitonName && transition.id !== transitionId) {
                tmp = true;
            }
        }
        return tmp;
    };

    $scope.getNextTransitionName = function (fromState) {
        var namesArray = [];
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            if ($scope.config.transitions[i].fromState == fromState) {
                namesArray.push($scope.config.transitions[i].name);
            }
        }
        var foundNextName = false;
        var tryChar = "a";
        while (!foundNextName) {
            var value = _.indexOf(namesArray, tryChar);
            if (value === -1) {
                foundNextName = true;
            } else {
                tryChar = String.fromCharCode(tryChar.charCodeAt() + 1);
            }
        }
        return tryChar;

    };

    /**
     * Adds a transition at the end of the transitions array
     * @param {number} fromState      The id from the fromState
     * @param {number} toState        The id from the toState
     * @param {String} transistonName The name of the Transition
     */
    $scope.addTransition = function (fromState, toState, transitonName) {
        //can only create the transition if it is unique-> not for the ndfa
        //there must be a fromState and toState, before adding a transition
        if (!$scope.existsTransition(fromState, toState, transitonName) && $scope.existsStateWithId(fromState) &&
            $scope.existsStateWithId(toState)) {
            $scope.addToAlphabet(transitonName);
            return $scope.addTransitionWithId($scope.config.countTransitionId++, fromState, toState, transitonName);

        } else {
            //TODO: BETTER DEBUG
        }
    };

    /**
     * Adds a transition at the end of the transitions array -> for import 
     * !!!dont use at other places!!!!! ONLY FOR IMPORT
     * @param {number} fromState      The id from the fromState
     * @param {number} toState        The id from the toState
     * @param {String} transistonName The name of the Transition
     */
    $scope.addTransitionWithId = function (transitionId, fromState, toState, transitonName) {
        $scope.config.transitions.push(new TransitionDFA(transitionId, fromState, toState, transitonName));

        //drawTransistion
        $scope.statediagram.drawTransition(transitionId);
        $scope.updateListener();
        //fix changes wont update after addTransisiton from the statediagram
        $scope.safeApply();
        return $scope.getTransitionById(transitionId);
    };

    /**
     * Get the array index from the transition with the given transitionId
     * @param  {number} transitionId 
     * @return {number}         Returns the index and -1 when state with transistionId not found
     */
    $scope.getArrayTransitionIdByTransitionId = function (transitionId) {
        return _.findIndex($scope.config.transitions, function (transition) {
            if (transition.id == transitionId) {
                return transition;
            }
        });
    };

    /**
     * Returns the transition of the given transitionId
     * @param  {number} transitionId 
     * @return {object}        Returns the objectreference of the state
     */
    $scope.getTransitionById = function (transitionId) {
        return $scope.config.transitions[$scope.getArrayTransitionIdByTransitionId(transitionId)];
    };

    /**
     * Checks if a transition with the params already exists
     * @param  {number}  fromState      Id of the fromstate
     * @param  {number}  toState        id from the toState
     * @param  {Strin}  transitonName The name of the transition
     * @return {Boolean}                
     */
    $scope.getTransition = function (fromState, toState, transitonName) {
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var transition = $scope.config.transitions[i];
            if (transition.fromState == fromState && transition.toState == toState && transition.name == transitonName) {
                return transition;
            }
        }
        return undefined;
    };


    /**
     * Removes the transistion
     * @param {number} transitionId      The id from the transition
     */
    $scope.removeTransition = function (transitionId) {
        //remove old transition from alphabet if this transition only used this char
        $scope.removeFromAlphabetIfNotUsedFromOthers(transitionId);
        //first remove the element from the svg after that remove it from the array
        $scope.statediagram.removeTransition(transitionId);
        $scope.config.transitions.splice($scope.getArrayTransitionIdByTransitionId(transitionId), 1);
        //update other listeners when remove is finished
        $scope.updateListener();
    };

    /**
     * Renames a transition if is uniqe with the new name
     * @param  {number} transitionId     
     * @param  {String} newTransitionName 
     */
    $scope.renameTransition = function (transitionId, newTransitionName) {
        var transition = $scope.getTransitionById(transitionId);
        if (!$scope.existsTransition(transition.fromState, transition.toState, newTransitionName)) {
            var tmpTransition = $scope.getTransitionById(transitionId);
            //remove old transition from alphabet if this transition only used this char
            $scope.removeFromAlphabetIfNotUsedFromOthers(transitionId);
            //add new transitionname to the alphabet
            $scope.addToAlphabet(newTransitionName);
            //save the new transitionname
            $scope.getTransitionById(transitionId).name = newTransitionName;
            //Rename the state on the statediagram
            $scope.statediagram.renameTransition(transition.fromState, transition.toState, transitionId, newTransitionName);
            $scope.updateListener();
            return true;
        } else {
            //TODO: BETTER DEBUG
            return false;
        }
    };
}
//Simulator for the simulation of the automata
function DFA($scope, $translate) {
    "use strict";
    //selfReference
    //for debug puposes better way for acessing in console?
    window.debugScope = $scope;
    //define scope

    //Default Config for the automaton
    $scope.defaultConfig = {};
    //the default prefix for autonaming for example S0,S1,... after the prefix it saves the id
    $scope.defaultConfig.statePrefix = 'S';
    //Suffix after a transition name on the statediagram
    $scope.defaultConfig.transitionNameSuffix = '|';
    $scope.defaultConfig.diagramm = {
        x: 0,
        y: 0,
        scale: 1,
        updatedWithZoomBehavior: false
    };
    //Number of statesIds given to states
    $scope.defaultConfig.countStateId = 0;
    //Number of transitionIds given to transitions
    $scope.defaultConfig.countTransitionId = 0;
    //The States are saved like {id:stateId,name:"nameoftheState",x:50,y:50}
    $scope.defaultConfig.states = [];
    //Only a number representing the id of the state
    $scope.defaultConfig.startState = null;
    //An array of numbers representing the ids of the finalStates
    $scope.defaultConfig.finalStates = [];
    //the transitions are saved like{fromState:stateId, toState:stateId, name:"transitionName"}
    $scope.defaultConfig.transitions = [];
    //alphabet
    $scope.defaultConfig.alphabet = [];
    //the name of the inputWord
    $scope.defaultConfig.inputWord = '';
    //the default name
    $scope.defaultConfig.name = "Untitled Automaton";
    //if there is something unsaved
    $scope.defaultConfig.unSavedChanges = false;
    //has the drawn Transition
    //{fromState:0,toState:0,names:["a","b"], objReference:};
    //if there is already a transition with the right fromState and toState, thenn only add myname to the names array
    $scope.defaultConfig.drawnTransitions = [];

    //Config Object
    $scope.config = cloneObject($scope.defaultConfig);




    //Array of all update Listeners
    $scope.updateListeners = [];

    //the simulator controlling the simulation
    $scope.simulator = new SimulationDFA($scope);
    // the table where states and transitions are shown
    $scope.table = new TableDFA($scope);
    //the statediagram controlling the svg diagramm
    $scope.statediagram = new StateDiagramDFA($scope, "#diagramm-svg");
    //the statetransitionfunction controlling the statetransitionfunction-table
    $scope.statetransitionfunction = new StatetransitionfunctionDFA($scope);
    //for the testdata
    $scope.testData = new TestData($scope);

    //for the showing/hiding of the Input Field of the automaton name
    $scope.inNameEdit = false;



    /**
     * Add the options to the modal.
     * @param {String} newHeadline Headline of the shown modal.
     * @param {String} newMessage Message of the shown modal. 
     */
    $scope.showModalWithMessage = function (newTitle, newDescription, action, button) {
        $scope.title = newTitle;
        $scope.description = newDescription;
        $scope.modalAction = action;
        if (button === undefined) {
            $scope.button = "MODAL_BUTTON.PROCEED";
        } else {
            $scope.button = button;
        }
        //change it to angular function
        $("#modal").modal();
    };

    /**
     * Executes the modal action-> when clicking on the action button
     */
    $scope.executeModalAction = function () {
        $scope.$eval($scope.modalAction);
    };


    /**
     * Options for the stepTimeOut-Slider
     */
    $scope.stepTimeOutSlider = {
        options: {
            floor: 0,
            step: 100,
            ceil: 3000,
            hideLimitLabels: true,
            translate: function (value) {
                return value + ' ms';
            }
        }
    };

    /**
     * Options for the loopTimeOut-Slider
     */
    $scope.loopTimeOutSlider = {
        options: {
            floor: 0,
            step: 100,
            ceil: 4000,
            hideLimitLabels: true,
            translate: function (value) {
                return value + ' ms';
            }
        }
    };

    /**
     * Leave the input field after clicking the enter button
     */
    $scope.keypressCallback = function ($event) {
        if ($event.charCode == 13) {
            document.getElementById("automatonNameEdit").blur();
        }
    };

    /**
     * Prevent leaving site
     */
    window.onbeforeunload = function (event) {
        //turn true when you want the leaving protection
        if ($scope.config.unSavedChanges) {
            var closemessage = "All Changes will be Lost. Save before continue!";
            if (typeof event == 'undefined') {
                event = window.event;
            }
            if (event) {
                event.returnValue = closemessage;
            }
            return closemessage;

        }
    };

    /**
     * Saves the automata
     */
    $scope.saveAutomaton = function () {
        $scope.config.unSavedChanges = false;

    };

    //from https://coderwall.com/p/ngisma/safe-apply-in-angular-js
    //fix for $apply already in progress
    $scope.safeApply = function (fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn && (typeof (fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };

    /**
     * Removes the current automata and the inputWord
     */
    $scope.resetAutomaton = function () {
        //clear the svgContent
        $scope.statediagram.clearSvgContent();
        $scope.simulator.reset();

        //get the new config
        $scope.config = cloneObject($scope.defaultConfig);
        $scope.safeApply();
        $scope.updateListener();
    };

    /**
     * Adds a char to the input alphabet if the char is not available
     * @param   {value} value the char, which is to be added
     */
    $scope.addToAlphabet = function (value) {
        if (!_.some($scope.config.alphabet, function (a) {
                return a === value;
            })) {
            $scope.config.alphabet.push(value);
        } else {

        }

    };

    /**
     * Removes a char from the alphavet if this char is only used from the given transition
     * @param   {number}  transitionId 
     * @returns {boolean} true if it was removed false if not removed
     */
    $scope.removeFromAlphabetIfNotUsedFromOthers = function (transitionId) {
        var tmpTransition = $scope.getTransitionById(transitionId);
        //search if an other transition use the same name
        var usedByOthers = false;
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            if (tmpTransition.name === $scope.config.transitions[i].name && $scope.config.transitions[i].id !== transitionId) {
                usedByOthers = true;
                return;
            }
        }

        if (!usedByOthers) {
            _.pull($scope.config.alphabet, tmpTransition.name);
            return true;
        } else {
            return false;
        }
    };

    /**
     * This function calls the method updateFunction of every element in $scope.updateListeners
     */
    $scope.updateListener = function () {
        //call each updateListener
        _.forEach($scope.updateListeners, function (value, key) {
            value.updateFunction();
        });
        //after every update we show the user that he has unsaved changes
        $scope.config.unSavedChanges = true;

    };

    //STATE FUNCTIONS START

    /**
     * Checks if a state exists with the given name
     * @param  {String}  stateName       
     * @param {Int} stateID optionally dont check with this stateid
     * @return {Boolean} 
     */
    $scope.existsStateWithName = function (stateName, stateID) {
        var tmp = false;
        _.forEach($scope.config.states, function (state) {
            if (state.name == stateName && state.id !== stateID) {
                tmp = true;
                return;
            }
        });
        return tmp;
    };

    /**
     * Checks if a state exists with the given id
     * @param  {Id} stateId 
     * @return {Boolean}           
     */
    $scope.existsStateWithId = function (stateId) {
        for (var i = 0; i < $scope.config.states.length; i++) {
            if ($scope.config.states[i].id == stateId)
                return true;
        }
        return false;
    };

    /**
     * returns if the node has transitions
     * @param  {number}  stateId 
     * @return {Boolean}         
     */
    $scope.hasStateTransitions = function (stateId) {
        var tmp = false;
        _.forEach($scope.config.transitions, function (transition) {
            if (transition.fromState == stateId || transition.toState == stateId) {
                tmp = true;
            }
        });
        return tmp;
    };

    /**
     * Get the array index from the state with the given stateId
     * @param  {number} stateId 
     * @return {number}         Returns the index and -1 when state with stateId not found
     */
    $scope.getArrayStateIdByStateId = function (stateId) {
        return _.findIndex($scope.config.states, function (state) {
            if (state.id == stateId) {
                return state;
            }
        });
    };

    /**
     * Returns the State with the given stateId
     * @param  {number} stateId 
     * @return {object}        Returns the objectreference of the state undefined if not found
     */
    $scope.getStateById = function (stateId) {

        return $scope.config.states[$scope.getArrayStateIdByStateId(stateId)];
    };

    /**
     * Returns the State with the given stateName
     * @param  {number} stateId 
     * @return {object}        Returns the objectreference of the state undefined if not found
     */
    $scope.getStateByName = function (stateName) {

        return $scope.config.states[$scope.getArrayStateIdByStateId(function (stateName) {

        })];
    };
    /**
     * Add a state with default name
     * @param {number} x 
     * @param {number} y 
     * @returns {object} the created object
     */
    $scope.addStateWithPresets = function (x, y) {
        var obj = $scope.addState(($scope.config.statePrefix + $scope.config.countStateId), x, y);
        //if u created a state then make the first state as startState ( default)
        if ($scope.config.countStateId == 1) {
            $scope.changeStartState(0);
        }
        return obj;
    };

    /**
     * Adds a state at the end of the states array
     * @param {String} stateName 
     * @param {number} x         
     * @param {number} y         
     * @returns {object} the created object
     */
    $scope.addState = function (stateName, x, y) {
        if (!$scope.existsStateWithName(stateName)) {
            return $scope.addStateWithId($scope.config.countStateId++, stateName, x, y);
        } else {
            //TODO: BETTER DEBUG  
            return null;
        }
    };

    /**
     * Adds a state at the end of the states array with a variable id
     * !!!dont use at other places!!!!
     * @param {String} stateName 
     * @param {number} x         
     * @param {number} y   
     * @returns {object} the created object
     */
    $scope.addStateWithId = function (stateId, stateName, x, y) {
        var addedStateId = $scope.config.states.push(new State(stateId, stateName, x, y));
        //draw the State after the State is added
        $scope.statediagram.drawState(stateId);
        $scope.updateListener();
        //fix changes wont update after addTransisiton from the statediagram
        $scope.safeApply();
        return $scope.getStateById(stateId);
    };

    /**
     * Removes the state with the given id
     * @param  {number} stateId 
     */
    $scope.removeState = function (stateId) {
        if ($scope.hasStateTransitions(stateId)) {
            //TODO: BETTER DEBUG
            $scope.showModalWithMessage('STATE_MENU.DELETE_MODAL_TITLE', 'STATE_MENU.DELETE_MODAL_DESC', 'forcedRemoveState(' + stateId + ')', 'MODAL_BUTTON.DELETE');
        } else {
            //if the state is a final state move this state from the final states
            if ($scope.isStateAFinalState(stateId)) {
                $scope.removeFinalState(stateId);
            }
            //if state is a start State remove the state from the startState
            if ($scope.config.startState == stateId) {
                $scope.config.startState = null;
            }
            //first remove the element from the svg after that remove it from the array
            $scope.statediagram.removeState(stateId);
            $scope.config.states.splice($scope.getArrayStateIdByStateId(stateId), 1);
            //update the other listeners when remove is finished
            $scope.updateListener();
        }
    };

    $scope.forcedRemoveState = function (stateId) {
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var tmpTransition = $scope.config.transitions[i];
            if (tmpTransition.fromState === stateId || tmpTransition.toState === stateId) {
                $scope.removeTransition(tmpTransition.id);
                i--;
            }
        }
        $scope.removeState(stateId);
    };

    /**
     * Rename a state if the newStatename isnt already used
     * @param  {number}  stateId      
     * @param  {State}   newStateName 
     * @returns {boolean} true if success false if no succes
     */
    $scope.renameState = function (stateId, newStateName) {
        if ($scope.existsStateWithName(newStateName)) {
            //TODO: BETTER DEBUG
            return false;
        } else {
            $scope.getStateById(stateId).name = newStateName;
            //Rename the state on the statediagram
            $scope.statediagram.renameState(stateId, newStateName);
            $scope.updateListener();
            return true;
        }
    };

    /**
     * Changes the start state to the given state id
     */
    $scope.changeStartState = function (stateId) {
        if ($scope.existsStateWithId(stateId)) {
            //change on statediagram and others
            $scope.statediagram.changeStartState(stateId);
            //change the startState then
            $scope.config.startState = stateId;

            //update the listeners after the startState is set
            $scope.updateListener();
        } else {
            //TODO: BETTER DEBUG
        }
    };

    /**
     * Removes the start state 
     */
    $scope.removeStartState = function () {
        //TODO What is dis
        if ($scope.config.startState !== null) {
            //change on statediagram and others
            $scope.statediagram.removeStartState();
            $scope.updateListener();
            //change the startState
            $scope.config.startState = null;
        }

    };

    /**
     * Returns the Index of the saved FinalState
     * @param  {number} stateId 
     * @return {number}
     */
    $scope.getFinalStateIndexByStateId = function (stateId) {
        return _.indexOf($scope.config.finalStates, stateId);
    };

    /**
     * Returns if the state is a finalState
     * @param  {number} stateId 
     * @return {Boolean}         
     */
    $scope.isStateAFinalState = function (stateId) {
        for (var i = 0; i < $scope.config.finalStates.length; i++) {
            if ($scope.config.finalStates[i] == stateId)
                return true;
        }
        return false;
    };

    /**
     * Add a state as final State if it isnt already added and if their is a state with such a id
     */
    $scope.addFinalState = function (stateId) {
        if (!$scope.isStateAFinalState(stateId)) {
            $scope.config.finalStates.push(stateId);
            //add to the statediagram
            $scope.statediagram.addFinalState(stateId);
            $scope.updateListener();
        } else {
            //TODO: BETTER DEBUG
        }
    };

    /**
     * Remove a state from the final states
     * @return {[type]} [description]
     */
    $scope.removeFinalState = function (stateId) {
        if ($scope.isStateAFinalState(stateId)) {
            //remove from statediagram
            $scope.statediagram.removeFinalState(stateId);
            $scope.updateListener();
            $scope.config.finalStates.splice($scope.getFinalStateIndexByStateId(stateId), 1);
        } else {
            //TODO: Better DBUG
        }
    };

    //TRANSITIONS

    /**
     * Checks if a transition with the params already exists
     * @param  {number}  fromState      Id of the fromstate
     * @param  {number}  toState        id from the toState
     * @param  {Strin}  transitonName The name of the transition
     * @return {Boolean}                
     */
    $scope.existsTransition = function (fromState, toState, transitonName, transitionId) {
        var tmp = false;
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var transition = $scope.config.transitions[i];
            //NFA == if (transition.fromState == fromState && transition.name == transitonName && transition.id !== transitionId) {
            if (transition.fromState == fromState && transition.name == transitonName && transition.id !== transitionId) {
                tmp = true;
            }
        }
        return tmp;
    };

    $scope.getNextTransitionName = function (fromState) {
        var namesArray = [];
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            if ($scope.config.transitions[i].fromState == fromState) {
                namesArray.push($scope.config.transitions[i].name);
            }
        }
        var foundNextName = false;
        var tryChar = "a";
        while (!foundNextName) {
            var value = _.indexOf(namesArray, tryChar);
            if (value === -1) {
                foundNextName = true;
            } else {
                tryChar = String.fromCharCode(tryChar.charCodeAt() + 1);
            }
        }
        return tryChar;

    };

    /**
     * Adds a transition at the end of the transitions array
     * @param {number} fromState      The id from the fromState
     * @param {number} toState        The id from the toState
     * @param {String} transistonName The name of the Transition
     */
    $scope.addTransition = function (fromState, toState, transitonName) {
        //can only create the transition if it is unique-> not for the ndfa
        //there must be a fromState and toState, before adding a transition
        if (!$scope.existsTransition(fromState, toState, transitonName) && $scope.existsStateWithId(fromState) &&
            $scope.existsStateWithId(toState)) {
            $scope.addToAlphabet(transitonName);
            return $scope.addTransitionWithId($scope.config.countTransitionId++, fromState, toState, transitonName);

        } else {
            //TODO: BETTER DEBUG
        }
    };

    /**
     * Adds a transition at the end of the transitions array -> for import 
     * !!!dont use at other places!!!!! ONLY FOR IMPORT
     * @param {number} fromState      The id from the fromState
     * @param {number} toState        The id from the toState
     * @param {String} transistonName The name of the Transition
     */
    $scope.addTransitionWithId = function (transitionId, fromState, toState, transitonName) {
        $scope.config.transitions.push(new TransitionDFA(transitionId, fromState, toState, transitonName));

        //drawTransistion
        $scope.statediagram.drawTransition(transitionId);
        $scope.updateListener();
        //fix changes wont update after addTransisiton from the statediagram
        $scope.safeApply();
        return $scope.getTransitionById(transitionId);
    };

    /**
     * Get the array index from the transition with the given transitionId
     * @param  {number} transitionId 
     * @return {number}         Returns the index and -1 when state with transistionId not found
     */
    $scope.getArrayTransitionIdByTransitionId = function (transitionId) {
        return _.findIndex($scope.config.transitions, function (transition) {
            if (transition.id == transitionId) {
                return transition;
            }
        });
    };

    /**
     * Returns the transition of the given transitionId
     * @param  {number} transitionId 
     * @return {object}        Returns the objectreference of the state
     */
    $scope.getTransitionById = function (transitionId) {
        return $scope.config.transitions[$scope.getArrayTransitionIdByTransitionId(transitionId)];
    };

    /**
     * Checks if a transition with the params already exists
     * @param  {number}  fromState      Id of the fromstate
     * @param  {number}  toState        id from the toState
     * @param  {Strin}  transitonName The name of the transition
     * @return {Boolean}                
     */
    $scope.getTransition = function (fromState, toState, transitonName) {
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var transition = $scope.config.transitions[i];
            if (transition.fromState == fromState && transition.toState == toState && transition.name == transitonName) {
                return transition;
            }
        }
        return undefined;
    };


    /**
     * Removes the transistion
     * @param {number} transitionId      The id from the transition
     */
    $scope.removeTransition = function (transitionId) {
        //remove old transition from alphabet if this transition only used this char
        $scope.removeFromAlphabetIfNotUsedFromOthers(transitionId);
        //first remove the element from the svg after that remove it from the array
        $scope.statediagram.removeTransition(transitionId);
        $scope.config.transitions.splice($scope.getArrayTransitionIdByTransitionId(transitionId), 1);
        //update other listeners when remove is finished
        $scope.updateListener();
    };

    /**
     * Renames a transition if is uniqe with the new name
     * @param  {number} transitionId     
     * @param  {String} newTransitionName 
     */
    $scope.renameTransition = function (transitionId, newTransitionName) {
        var transition = $scope.getTransitionById(transitionId);
        if (!$scope.existsTransition(transition.fromState, transition.toState, newTransitionName)) {
            var tmpTransition = $scope.getTransitionById(transitionId);
            //remove old transition from alphabet if this transition only used this char
            $scope.removeFromAlphabetIfNotUsedFromOthers(transitionId);
            //add new transitionname to the alphabet
            $scope.addToAlphabet(newTransitionName);
            //save the new transitionname
            $scope.getTransitionById(transitionId).name = newTransitionName;
            //Rename the state on the statediagram
            $scope.statediagram.renameTransition(transition.fromState, transition.toState, transitionId, newTransitionName);
            $scope.updateListener();
            return true;
        } else {
            //TODO: BETTER DEBUG
            return false;
        }
    };
}
//Simulator for the simulation of the automata
function DFA($scope, $translate) {
    "use strict";
    //selfReference
    //for debug puposes better way for acessing in console?
    window.debugScope = $scope;
    //define scope

    //Default Config for the automaton
    $scope.defaultConfig = {};
    //the default prefix for autonaming for example S0,S1,... after the prefix it saves the id
    $scope.defaultConfig.statePrefix = 'S';
    //Suffix after a transition name on the statediagram
    $scope.defaultConfig.transitionNameSuffix = '|';
    $scope.defaultConfig.diagramm = {
        x: 0,
        y: 0,
        scale: 1,
        updatedWithZoomBehavior: false
    };
    //Number of statesIds given to states
    $scope.defaultConfig.countStateId = 0;
    //Number of transitionIds given to transitions
    $scope.defaultConfig.countTransitionId = 0;
    //The States are saved like {id:stateId,name:"nameoftheState",x:50,y:50}
    $scope.defaultConfig.states = [];
    //Only a number representing the id of the state
    $scope.defaultConfig.startState = null;
    //An array of numbers representing the ids of the finalStates
    $scope.defaultConfig.finalStates = [];
    //the transitions are saved like{fromState:stateId, toState:stateId, name:"transitionName"}
    $scope.defaultConfig.transitions = [];
    //alphabet
    $scope.defaultConfig.alphabet = [];
    //the name of the inputWord
    $scope.defaultConfig.inputWord = '';
    //the default name
    $scope.defaultConfig.name = "Untitled Automaton";
    //if there is something unsaved
    $scope.defaultConfig.unSavedChanges = false;
    //has the drawn Transition
    //{fromState:0,toState:0,names:["a","b"], objReference:};
    //if there is already a transition with the right fromState and toState, thenn only add myname to the names array
    $scope.defaultConfig.drawnTransitions = [];

    //Config Object
    $scope.config = cloneObject($scope.defaultConfig);




    //Array of all update Listeners
    $scope.updateListeners = [];

    //the simulator controlling the simulation
    $scope.simulator = new SimulationDFA($scope);
    // the table where states and transitions are shown
    $scope.table = new TableDFA($scope);
    //the statediagram controlling the svg diagramm
    $scope.statediagram = new StateDiagramDFA($scope, "#diagramm-svg");
    //the statetransitionfunction controlling the statetransitionfunction-table
    $scope.statetransitionfunction = new StatetransitionfunctionDFA($scope);
    //for the testdata
    $scope.testData = new TestData($scope);

    //for the showing/hiding of the Input Field of the automaton name
    $scope.inNameEdit = false;



    /**
     * Add the options to the modal.
     * @param {String} newHeadline Headline of the shown modal.
     * @param {String} newMessage Message of the shown modal. 
     */
    $scope.showModalWithMessage = function (newTitle, newDescription, action, button) {
        $scope.title = newTitle;
        $scope.description = newDescription;
        $scope.modalAction = action;
        if (button === undefined) {
            $scope.button = "MODAL_BUTTON.PROCEED";
        } else {
            $scope.button = button;
        }
        //change it to angular function
        $("#modal").modal();
    };

    /**
     * Executes the modal action-> when clicking on the action button
     */
    $scope.executeModalAction = function () {
        $scope.$eval($scope.modalAction);
    };


    /**
     * Options for the stepTimeOut-Slider
     */
    $scope.stepTimeOutSlider = {
        options: {
            floor: 0,
            step: 100,
            ceil: 3000,
            hideLimitLabels: true,
            translate: function (value) {
                return value + ' ms';
            }
        }
    };

    /**
     * Options for the loopTimeOut-Slider
     */
    $scope.loopTimeOutSlider = {
        options: {
            floor: 0,
            step: 100,
            ceil: 4000,
            hideLimitLabels: true,
            translate: function (value) {
                return value + ' ms';
            }
        }
    };

    /**
     * Leave the input field after clicking the enter button
     */
    $scope.keypressCallback = function ($event) {
        if ($event.charCode == 13) {
            document.getElementById("automatonNameEdit").blur();
        }
    };

    /**
     * Prevent leaving site
     */
    window.onbeforeunload = function (event) {
        //turn true when you want the leaving protection
        if ($scope.config.unSavedChanges) {
            var closemessage = "All Changes will be Lost. Save before continue!";
            if (typeof event == 'undefined') {
                event = window.event;
            }
            if (event) {
                event.returnValue = closemessage;
            }
            return closemessage;

        }
    };

    /**
     * Saves the automata
     */
    $scope.saveAutomaton = function () {
        $scope.config.unSavedChanges = false;

    };

    //from https://coderwall.com/p/ngisma/safe-apply-in-angular-js
    //fix for $apply already in progress
    $scope.safeApply = function (fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn && (typeof (fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };

    /**
     * Removes the current automata and the inputWord
     */
    $scope.resetAutomaton = function () {
        //clear the svgContent
        $scope.statediagram.clearSvgContent();
        $scope.simulator.reset();

        //get the new config
        $scope.config = cloneObject($scope.defaultConfig);
        $scope.safeApply();
        $scope.updateListener();
    };

    /**
     * Adds a char to the input alphabet if the char is not available
     * @param   {value} value the char, which is to be added
     */
    $scope.addToAlphabet = function (value) {
        if (!_.some($scope.config.alphabet, function (a) {
                return a === value;
            })) {
            $scope.config.alphabet.push(value);
        } else {

        }

    };

    /**
     * Removes a char from the alphavet if this char is only used from the given transition
     * @param   {number}  transitionId 
     * @returns {boolean} true if it was removed false if not removed
     */
    $scope.removeFromAlphabetIfNotUsedFromOthers = function (transitionId) {
        var tmpTransition = $scope.getTransitionById(transitionId);
        //search if an other transition use the same name
        var usedByOthers = false;
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            if (tmpTransition.name === $scope.config.transitions[i].name && $scope.config.transitions[i].id !== transitionId) {
                usedByOthers = true;
                return;
            }
        }

        if (!usedByOthers) {
            _.pull($scope.config.alphabet, tmpTransition.name);
            return true;
        } else {
            return false;
        }
    };

    /**
     * This function calls the method updateFunction of every element in $scope.updateListeners
     */
    $scope.updateListener = function () {
        //call each updateListener
        _.forEach($scope.updateListeners, function (value, key) {
            value.updateFunction();
        });
        //after every update we show the user that he has unsaved changes
        $scope.config.unSavedChanges = true;

    };

    //STATE FUNCTIONS START

    /**
     * Checks if a state exists with the given name
     * @param  {String}  stateName       
     * @param {Int} stateID optionally dont check with this stateid
     * @return {Boolean} 
     */
    $scope.existsStateWithName = function (stateName, stateID) {
        var tmp = false;
        _.forEach($scope.config.states, function (state) {
            if (state.name == stateName && state.id !== stateID) {
                tmp = true;
                return;
            }
        });
        return tmp;
    };

    /**
     * Checks if a state exists with the given id
     * @param  {Id} stateId 
     * @return {Boolean}           
     */
    $scope.existsStateWithId = function (stateId) {
        for (var i = 0; i < $scope.config.states.length; i++) {
            if ($scope.config.states[i].id == stateId)
                return true;
        }
        return false;
    };

    /**
     * returns if the node has transitions
     * @param  {number}  stateId 
     * @return {Boolean}         
     */
    $scope.hasStateTransitions = function (stateId) {
        var tmp = false;
        _.forEach($scope.config.transitions, function (transition) {
            if (transition.fromState == stateId || transition.toState == stateId) {
                tmp = true;
            }
        });
        return tmp;
    };

    /**
     * Get the array index from the state with the given stateId
     * @param  {number} stateId 
     * @return {number}         Returns the index and -1 when state with stateId not found
     */
    $scope.getArrayStateIdByStateId = function (stateId) {
        return _.findIndex($scope.config.states, function (state) {
            if (state.id == stateId) {
                return state;
            }
        });
    };

    /**
     * Returns the State with the given stateId
     * @param  {number} stateId 
     * @return {object}        Returns the objectreference of the state undefined if not found
     */
    $scope.getStateById = function (stateId) {

        return $scope.config.states[$scope.getArrayStateIdByStateId(stateId)];
    };

    /**
     * Returns the State with the given stateName
     * @param  {number} stateId 
     * @return {object}        Returns the objectreference of the state undefined if not found
     */
    $scope.getStateByName = function (stateName) {

        return $scope.config.states[$scope.getArrayStateIdByStateId(function (stateName) {

        })];
    };
    /**
     * Add a state with default name
     * @param {number} x 
     * @param {number} y 
     * @returns {object} the created object
     */
    $scope.addStateWithPresets = function (x, y) {
        var obj = $scope.addState(($scope.config.statePrefix + $scope.config.countStateId), x, y);
        //if u created a state then make the first state as startState ( default)
        if ($scope.config.countStateId == 1) {
            $scope.changeStartState(0);
        }
        return obj;
    };

    /**
     * Adds a state at the end of the states array
     * @param {String} stateName 
     * @param {number} x         
     * @param {number} y         
     * @returns {object} the created object
     */
    $scope.addState = function (stateName, x, y) {
        if (!$scope.existsStateWithName(stateName)) {
            return $scope.addStateWithId($scope.config.countStateId++, stateName, x, y);
        } else {
            //TODO: BETTER DEBUG  
            return null;
        }
    };

    /**
     * Adds a state at the end of the states array with a variable id
     * !!!dont use at other places!!!!
     * @param {String} stateName 
     * @param {number} x         
     * @param {number} y   
     * @returns {object} the created object
     */
    $scope.addStateWithId = function (stateId, stateName, x, y) {
        var addedStateId = $scope.config.states.push(new State(stateId, stateName, x, y));
        //draw the State after the State is added
        $scope.statediagram.drawState(stateId);
        $scope.updateListener();
        //fix changes wont update after addTransisiton from the statediagram
        $scope.safeApply();
        return $scope.getStateById(stateId);
    };

    /**
     * Removes the state with the given id
     * @param  {number} stateId 
     */
    $scope.removeState = function (stateId) {
        if ($scope.hasStateTransitions(stateId)) {
            //TODO: BETTER DEBUG
            $scope.showModalWithMessage('STATE_MENU.DELETE_MODAL_TITLE', 'STATE_MENU.DELETE_MODAL_DESC', 'forcedRemoveState(' + stateId + ')', 'MODAL_BUTTON.DELETE');
        } else {
            //if the state is a final state move this state from the final states
            if ($scope.isStateAFinalState(stateId)) {
                $scope.removeFinalState(stateId);
            }
            //if state is a start State remove the state from the startState
            if ($scope.config.startState == stateId) {
                $scope.config.startState = null;
            }
            //first remove the element from the svg after that remove it from the array
            $scope.statediagram.removeState(stateId);
            $scope.config.states.splice($scope.getArrayStateIdByStateId(stateId), 1);
            //update the other listeners when remove is finished
            $scope.updateListener();
        }
    };

    $scope.forcedRemoveState = function (stateId) {
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var tmpTransition = $scope.config.transitions[i];
            if (tmpTransition.fromState === stateId || tmpTransition.toState === stateId) {
                $scope.removeTransition(tmpTransition.id);
                i--;
            }
        }
        $scope.removeState(stateId);
    };

    /**
     * Rename a state if the newStatename isnt already used
     * @param  {number}  stateId      
     * @param  {State}   newStateName 
     * @returns {boolean} true if success false if no succes
     */
    $scope.renameState = function (stateId, newStateName) {
        if ($scope.existsStateWithName(newStateName)) {
            //TODO: BETTER DEBUG
            return false;
        } else {
            $scope.getStateById(stateId).name = newStateName;
            //Rename the state on the statediagram
            $scope.statediagram.renameState(stateId, newStateName);
            $scope.updateListener();
            return true;
        }
    };

    /**
     * Changes the start state to the given state id
     */
    $scope.changeStartState = function (stateId) {
        if ($scope.existsStateWithId(stateId)) {
            //change on statediagram and others
            $scope.statediagram.changeStartState(stateId);
            //change the startState then
            $scope.config.startState = stateId;

            //update the listeners after the startState is set
            $scope.updateListener();
        } else {
            //TODO: BETTER DEBUG
        }
    };

    /**
     * Removes the start state 
     */
    $scope.removeStartState = function () {
        //TODO What is dis
        if ($scope.config.startState !== null) {
            //change on statediagram and others
            $scope.statediagram.removeStartState();
            $scope.updateListener();
            //change the startState
            $scope.config.startState = null;
        }

    };

    /**
     * Returns the Index of the saved FinalState
     * @param  {number} stateId 
     * @return {number}
     */
    $scope.getFinalStateIndexByStateId = function (stateId) {
        return _.indexOf($scope.config.finalStates, stateId);
    };

    /**
     * Returns if the state is a finalState
     * @param  {number} stateId 
     * @return {Boolean}         
     */
    $scope.isStateAFinalState = function (stateId) {
        for (var i = 0; i < $scope.config.finalStates.length; i++) {
            if ($scope.config.finalStates[i] == stateId)
                return true;
        }
        return false;
    };

    /**
     * Add a state as final State if it isnt already added and if their is a state with such a id
     */
    $scope.addFinalState = function (stateId) {
        if (!$scope.isStateAFinalState(stateId)) {
            $scope.config.finalStates.push(stateId);
            //add to the statediagram
            $scope.statediagram.addFinalState(stateId);
            $scope.updateListener();
        } else {
            //TODO: BETTER DEBUG
        }
    };

    /**
     * Remove a state from the final states
     * @return {[type]} [description]
     */
    $scope.removeFinalState = function (stateId) {
        if ($scope.isStateAFinalState(stateId)) {
            //remove from statediagram
            $scope.statediagram.removeFinalState(stateId);
            $scope.updateListener();
            $scope.config.finalStates.splice($scope.getFinalStateIndexByStateId(stateId), 1);
        } else {
            //TODO: Better DBUG
        }
    };

    //TRANSITIONS

    /**
     * Checks if a transition with the params already exists
     * @param  {number}  fromState      Id of the fromstate
     * @param  {number}  toState        id from the toState
     * @param  {Strin}  transitonName The name of the transition
     * @return {Boolean}                
     */
    $scope.existsTransition = function (fromState, toState, transitonName, transitionId) {
        var tmp = false;
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var transition = $scope.config.transitions[i];
            //NFA == if (transition.fromState == fromState && transition.name == transitonName && transition.id !== transitionId) {
            if (transition.fromState == fromState && transition.name == transitonName && transition.id !== transitionId) {
                tmp = true;
            }
        }
        return tmp;
    };

    $scope.getNextTransitionName = function (fromState) {
        var namesArray = [];
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            if ($scope.config.transitions[i].fromState == fromState) {
                namesArray.push($scope.config.transitions[i].name);
            }
        }
        var foundNextName = false;
        var tryChar = "a";
        while (!foundNextName) {
            var value = _.indexOf(namesArray, tryChar);
            if (value === -1) {
                foundNextName = true;
            } else {
                tryChar = String.fromCharCode(tryChar.charCodeAt() + 1);
            }
        }
        return tryChar;

    };

    /**
     * Adds a transition at the end of the transitions array
     * @param {number} fromState      The id from the fromState
     * @param {number} toState        The id from the toState
     * @param {String} transistonName The name of the Transition
     */
    $scope.addTransition = function (fromState, toState, transitonName) {
        //can only create the transition if it is unique-> not for the ndfa
        //there must be a fromState and toState, before adding a transition
        if (!$scope.existsTransition(fromState, toState, transitonName) && $scope.existsStateWithId(fromState) &&
            $scope.existsStateWithId(toState)) {
            $scope.addToAlphabet(transitonName);
            return $scope.addTransitionWithId($scope.config.countTransitionId++, fromState, toState, transitonName);

        } else {
            //TODO: BETTER DEBUG
        }
    };

    /**
     * Adds a transition at the end of the transitions array -> for import 
     * !!!dont use at other places!!!!! ONLY FOR IMPORT
     * @param {number} fromState      The id from the fromState
     * @param {number} toState        The id from the toState
     * @param {String} transistonName The name of the Transition
     */
    $scope.addTransitionWithId = function (transitionId, fromState, toState, transitonName) {
        $scope.config.transitions.push(new TransitionDFA(transitionId, fromState, toState, transitonName));

        //drawTransistion
        $scope.statediagram.drawTransition(transitionId);
        $scope.updateListener();
        //fix changes wont update after addTransisiton from the statediagram
        $scope.safeApply();
        return $scope.getTransitionById(transitionId);
    };

    /**
     * Get the array index from the transition with the given transitionId
     * @param  {number} transitionId 
     * @return {number}         Returns the index and -1 when state with transistionId not found
     */
    $scope.getArrayTransitionIdByTransitionId = function (transitionId) {
        return _.findIndex($scope.config.transitions, function (transition) {
            if (transition.id == transitionId) {
                return transition;
            }
        });
    };

    /**
     * Returns the transition of the given transitionId
     * @param  {number} transitionId 
     * @return {object}        Returns the objectreference of the state
     */
    $scope.getTransitionById = function (transitionId) {
        return $scope.config.transitions[$scope.getArrayTransitionIdByTransitionId(transitionId)];
    };

    /**
     * Checks if a transition with the params already exists
     * @param  {number}  fromState      Id of the fromstate
     * @param  {number}  toState        id from the toState
     * @param  {Strin}  transitonName The name of the transition
     * @return {Boolean}                
     */
    $scope.getTransition = function (fromState, toState, transitonName) {
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var transition = $scope.config.transitions[i];
            if (transition.fromState == fromState && transition.toState == toState && transition.name == transitonName) {
                return transition;
            }
        }
        return undefined;
    };


    /**
     * Removes the transistion
     * @param {number} transitionId      The id from the transition
     */
    $scope.removeTransition = function (transitionId) {
        //remove old transition from alphabet if this transition only used this char
        $scope.removeFromAlphabetIfNotUsedFromOthers(transitionId);
        //first remove the element from the svg after that remove it from the array
        $scope.statediagram.removeTransition(transitionId);
        $scope.config.transitions.splice($scope.getArrayTransitionIdByTransitionId(transitionId), 1);
        //update other listeners when remove is finished
        $scope.updateListener();
    };

    /**
     * Renames a transition if is uniqe with the new name
     * @param  {number} transitionId     
     * @param  {String} newTransitionName 
     */
    $scope.renameTransition = function (transitionId, newTransitionName) {
        var transition = $scope.getTransitionById(transitionId);
        if (!$scope.existsTransition(transition.fromState, transition.toState, newTransitionName)) {
            var tmpTransition = $scope.getTransitionById(transitionId);
            //remove old transition from alphabet if this transition only used this char
            $scope.removeFromAlphabetIfNotUsedFromOthers(transitionId);
            //add new transitionname to the alphabet
            $scope.addToAlphabet(newTransitionName);
            //save the new transitionname
            $scope.getTransitionById(transitionId).name = newTransitionName;
            //Rename the state on the statediagram
            $scope.statediagram.renameTransition(transition.fromState, transition.toState, transitionId, newTransitionName);
            $scope.updateListener();
            return true;
        } else {
            //TODO: BETTER DEBUG
            return false;
        }
    };
}
//Simulator for the simulation of the automata
function DFA($scope, $translate) {
    "use strict";
    //selfReference
    //for debug puposes better way for acessing in console?
    window.debugScope = $scope;
    //define scope

    //Default Config for the automaton
    $scope.defaultConfig = {};
    //the default prefix for autonaming for example S0,S1,... after the prefix it saves the id
    $scope.defaultConfig.statePrefix = 'S';
    //Suffix after a transition name on the statediagram
    $scope.defaultConfig.transitionNameSuffix = '|';
    $scope.defaultConfig.diagramm = {
        x: 0,
        y: 0,
        scale: 1,
        updatedWithZoomBehavior: false
    };
    //Number of statesIds given to states
    $scope.defaultConfig.countStateId = 0;
    //Number of transitionIds given to transitions
    $scope.defaultConfig.countTransitionId = 0;
    //The States are saved like {id:stateId,name:"nameoftheState",x:50,y:50}
    $scope.defaultConfig.states = [];
    //Only a number representing the id of the state
    $scope.defaultConfig.startState = null;
    //An array of numbers representing the ids of the finalStates
    $scope.defaultConfig.finalStates = [];
    //the transitions are saved like{fromState:stateId, toState:stateId, name:"transitionName"}
    $scope.defaultConfig.transitions = [];
    //alphabet
    $scope.defaultConfig.alphabet = [];
    //the name of the inputWord
    $scope.defaultConfig.inputWord = '';
    //the default name
    $scope.defaultConfig.name = "Untitled Automaton";
    //if there is something unsaved
    $scope.defaultConfig.unSavedChanges = false;
    //has the drawn Transition
    //{fromState:0,toState:0,names:["a","b"], objReference:};
    //if there is already a transition with the right fromState and toState, thenn only add myname to the names array
    $scope.defaultConfig.drawnTransitions = [];

    //Config Object
    $scope.config = cloneObject($scope.defaultConfig);




    //Array of all update Listeners
    $scope.updateListeners = [];

    //the simulator controlling the simulation
    $scope.simulator = new SimulationDFA($scope);
    // the table where states and transitions are shown
    $scope.table = new TableDFA($scope);
    //the statediagram controlling the svg diagramm
    $scope.statediagram = new StateDiagramDFA($scope, "#diagramm-svg");
    //the statetransitionfunction controlling the statetransitionfunction-table
    $scope.statetransitionfunction = new StatetransitionfunctionDFA($scope);
    //for the testdata
    $scope.testData = new TestData($scope);

    //for the showing/hiding of the Input Field of the automaton name
    $scope.inNameEdit = false;



    /**
     * Add the options to the modal.
     * @param {String} newHeadline Headline of the shown modal.
     * @param {String} newMessage Message of the shown modal. 
     */
    $scope.showModalWithMessage = function (newTitle, newDescription, action, button) {
        $scope.title = newTitle;
        $scope.description = newDescription;
        $scope.modalAction = action;
        if (button === undefined) {
            $scope.button = "MODAL_BUTTON.PROCEED";
        } else {
            $scope.button = button;
        }
        //change it to angular function
        $("#modal").modal();
    };

    /**
     * Executes the modal action-> when clicking on the action button
     */
    $scope.executeModalAction = function () {
        $scope.$eval($scope.modalAction);
    };


    /**
     * Options for the stepTimeOut-Slider
     */
    $scope.stepTimeOutSlider = {
        options: {
            floor: 0,
            step: 100,
            ceil: 3000,
            hideLimitLabels: true,
            translate: function (value) {
                return value + ' ms';
            }
        }
    };

    /**
     * Options for the loopTimeOut-Slider
     */
    $scope.loopTimeOutSlider = {
        options: {
            floor: 0,
            step: 100,
            ceil: 4000,
            hideLimitLabels: true,
            translate: function (value) {
                return value + ' ms';
            }
        }
    };

    /**
     * Leave the input field after clicking the enter button
     */
    $scope.keypressCallback = function ($event) {
        if ($event.charCode == 13) {
            document.getElementById("automatonNameEdit").blur();
        }
    };

    /**
     * Prevent leaving site
     */
    window.onbeforeunload = function (event) {
        //turn true when you want the leaving protection
        if ($scope.config.unSavedChanges) {
            var closemessage = "All Changes will be Lost. Save before continue!";
            if (typeof event == 'undefined') {
                event = window.event;
            }
            if (event) {
                event.returnValue = closemessage;
            }
            return closemessage;

        }
    };

    /**
     * Saves the automata
     */
    $scope.saveAutomaton = function () {
        $scope.config.unSavedChanges = false;

    };

    //from https://coderwall.com/p/ngisma/safe-apply-in-angular-js
    //fix for $apply already in progress
    $scope.safeApply = function (fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn && (typeof (fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };

    /**
     * Removes the current automata and the inputWord
     */
    $scope.resetAutomaton = function () {
        //clear the svgContent
        $scope.statediagram.clearSvgContent();
        $scope.simulator.reset();

        //get the new config
        $scope.config = cloneObject($scope.defaultConfig);
        $scope.safeApply();
        $scope.updateListener();
    };

    /**
     * Adds a char to the input alphabet if the char is not available
     * @param   {value} value the char, which is to be added
     */
    $scope.addToAlphabet = function (value) {
        if (!_.some($scope.config.alphabet, function (a) {
                return a === value;
            })) {
            $scope.config.alphabet.push(value);
        } else {

        }

    };

    /**
     * Removes a char from the alphavet if this char is only used from the given transition
     * @param   {number}  transitionId 
     * @returns {boolean} true if it was removed false if not removed
     */
    $scope.removeFromAlphabetIfNotUsedFromOthers = function (transitionId) {
        var tmpTransition = $scope.getTransitionById(transitionId);
        //search if an other transition use the same name
        var usedByOthers = false;
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            if (tmpTransition.name === $scope.config.transitions[i].name && $scope.config.transitions[i].id !== transitionId) {
                usedByOthers = true;
                return;
            }
        }

        if (!usedByOthers) {
            _.pull($scope.config.alphabet, tmpTransition.name);
            return true;
        } else {
            return false;
        }
    };

    /**
     * This function calls the method updateFunction of every element in $scope.updateListeners
     */
    $scope.updateListener = function () {
        //call each updateListener
        _.forEach($scope.updateListeners, function (value, key) {
            value.updateFunction();
        });
        //after every update we show the user that he has unsaved changes
        $scope.config.unSavedChanges = true;

    };

    //STATE FUNCTIONS START

    /**
     * Checks if a state exists with the given name
     * @param  {String}  stateName       
     * @param {Int} stateID optionally dont check with this stateid
     * @return {Boolean} 
     */
    $scope.existsStateWithName = function (stateName, stateID) {
        var tmp = false;
        _.forEach($scope.config.states, function (state) {
            if (state.name == stateName && state.id !== stateID) {
                tmp = true;
                return;
            }
        });
        return tmp;
    };

    /**
     * Checks if a state exists with the given id
     * @param  {Id} stateId 
     * @return {Boolean}           
     */
    $scope.existsStateWithId = function (stateId) {
        for (var i = 0; i < $scope.config.states.length; i++) {
            if ($scope.config.states[i].id == stateId)
                return true;
        }
        return false;
    };

    /**
     * returns if the node has transitions
     * @param  {number}  stateId 
     * @return {Boolean}         
     */
    $scope.hasStateTransitions = function (stateId) {
        var tmp = false;
        _.forEach($scope.config.transitions, function (transition) {
            if (transition.fromState == stateId || transition.toState == stateId) {
                tmp = true;
            }
        });
        return tmp;
    };

    /**
     * Get the array index from the state with the given stateId
     * @param  {number} stateId 
     * @return {number}         Returns the index and -1 when state with stateId not found
     */
    $scope.getArrayStateIdByStateId = function (stateId) {
        return _.findIndex($scope.config.states, function (state) {
            if (state.id == stateId) {
                return state;
            }
        });
    };

    /**
     * Returns the State with the given stateId
     * @param  {number} stateId 
     * @return {object}        Returns the objectreference of the state undefined if not found
     */
    $scope.getStateById = function (stateId) {

        return $scope.config.states[$scope.getArrayStateIdByStateId(stateId)];
    };

    /**
     * Returns the State with the given stateName
     * @param  {number} stateId 
     * @return {object}        Returns the objectreference of the state undefined if not found
     */
    $scope.getStateByName = function (stateName) {

        return $scope.config.states[$scope.getArrayStateIdByStateId(function (stateName) {

        })];
    };
    /**
     * Add a state with default name
     * @param {number} x 
     * @param {number} y 
     * @returns {object} the created object
     */
    $scope.addStateWithPresets = function (x, y) {
        var obj = $scope.addState(($scope.config.statePrefix + $scope.config.countStateId), x, y);
        //if u created a state then make the first state as startState ( default)
        if ($scope.config.countStateId == 1) {
            $scope.changeStartState(0);
        }
        return obj;
    };

    /**
     * Adds a state at the end of the states array
     * @param {String} stateName 
     * @param {number} x         
     * @param {number} y         
     * @returns {object} the created object
     */
    $scope.addState = function (stateName, x, y) {
        if (!$scope.existsStateWithName(stateName)) {
            return $scope.addStateWithId($scope.config.countStateId++, stateName, x, y);
        } else {
            //TODO: BETTER DEBUG  
            return null;
        }
    };

    /**
     * Adds a state at the end of the states array with a variable id
     * !!!dont use at other places!!!!
     * @param {String} stateName 
     * @param {number} x         
     * @param {number} y   
     * @returns {object} the created object
     */
    $scope.addStateWithId = function (stateId, stateName, x, y) {
        var addedStateId = $scope.config.states.push(new State(stateId, stateName, x, y));
        //draw the State after the State is added
        $scope.statediagram.drawState(stateId);
        $scope.updateListener();
        //fix changes wont update after addTransisiton from the statediagram
        $scope.safeApply();
        return $scope.getStateById(stateId);
    };

    /**
     * Removes the state with the given id
     * @param  {number} stateId 
     */
    $scope.removeState = function (stateId) {
        if ($scope.hasStateTransitions(stateId)) {
            //TODO: BETTER DEBUG
            $scope.showModalWithMessage('STATE_MENU.DELETE_MODAL_TITLE', 'STATE_MENU.DELETE_MODAL_DESC', 'forcedRemoveState(' + stateId + ')', 'MODAL_BUTTON.DELETE');
        } else {
            //if the state is a final state move this state from the final states
            if ($scope.isStateAFinalState(stateId)) {
                $scope.removeFinalState(stateId);
            }
            //if state is a start State remove the state from the startState
            if ($scope.config.startState == stateId) {
                $scope.config.startState = null;
            }
            //first remove the element from the svg after that remove it from the array
            $scope.statediagram.removeState(stateId);
            $scope.config.states.splice($scope.getArrayStateIdByStateId(stateId), 1);
            //update the other listeners when remove is finished
            $scope.updateListener();
        }
    };

    $scope.forcedRemoveState = function (stateId) {
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var tmpTransition = $scope.config.transitions[i];
            if (tmpTransition.fromState === stateId || tmpTransition.toState === stateId) {
                $scope.removeTransition(tmpTransition.id);
                i--;
            }
        }
        $scope.removeState(stateId);
    };

    /**
     * Rename a state if the newStatename isnt already used
     * @param  {number}  stateId      
     * @param  {State}   newStateName 
     * @returns {boolean} true if success false if no succes
     */
    $scope.renameState = function (stateId, newStateName) {
        if ($scope.existsStateWithName(newStateName)) {
            //TODO: BETTER DEBUG
            return false;
        } else {
            $scope.getStateById(stateId).name = newStateName;
            //Rename the state on the statediagram
            $scope.statediagram.renameState(stateId, newStateName);
            $scope.updateListener();
            return true;
        }
    };

    /**
     * Changes the start state to the given state id
     */
    $scope.changeStartState = function (stateId) {
        if ($scope.existsStateWithId(stateId)) {
            //change on statediagram and others
            $scope.statediagram.changeStartState(stateId);
            //change the startState then
            $scope.config.startState = stateId;

            //update the listeners after the startState is set
            $scope.updateListener();
        } else {
            //TODO: BETTER DEBUG
        }
    };

    /**
     * Removes the start state 
     */
    $scope.removeStartState = function () {
        //TODO What is dis
        if ($scope.config.startState !== null) {
            //change on statediagram and others
            $scope.statediagram.removeStartState();
            $scope.updateListener();
            //change the startState
            $scope.config.startState = null;
        }

    };

    /**
     * Returns the Index of the saved FinalState
     * @param  {number} stateId 
     * @return {number}
     */
    $scope.getFinalStateIndexByStateId = function (stateId) {
        return _.indexOf($scope.config.finalStates, stateId);
    };

    /**
     * Returns if the state is a finalState
     * @param  {number} stateId 
     * @return {Boolean}         
     */
    $scope.isStateAFinalState = function (stateId) {
        for (var i = 0; i < $scope.config.finalStates.length; i++) {
            if ($scope.config.finalStates[i] == stateId)
                return true;
        }
        return false;
    };

    /**
     * Add a state as final State if it isnt already added and if their is a state with such a id
     */
    $scope.addFinalState = function (stateId) {
        if (!$scope.isStateAFinalState(stateId)) {
            $scope.config.finalStates.push(stateId);
            //add to the statediagram
            $scope.statediagram.addFinalState(stateId);
            $scope.updateListener();
        } else {
            //TODO: BETTER DEBUG
        }
    };

    /**
     * Remove a state from the final states
     * @return {[type]} [description]
     */
    $scope.removeFinalState = function (stateId) {
        if ($scope.isStateAFinalState(stateId)) {
            //remove from statediagram
            $scope.statediagram.removeFinalState(stateId);
            $scope.updateListener();
            $scope.config.finalStates.splice($scope.getFinalStateIndexByStateId(stateId), 1);
        } else {
            //TODO: Better DBUG
        }
    };

    //TRANSITIONS

    /**
     * Checks if a transition with the params already exists
     * @param  {number}  fromState      Id of the fromstate
     * @param  {number}  toState        id from the toState
     * @param  {Strin}  transitonName The name of the transition
     * @return {Boolean}                
     */
    $scope.existsTransition = function (fromState, toState, transitonName, transitionId) {
        var tmp = false;
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var transition = $scope.config.transitions[i];
            //NFA == if (transition.fromState == fromState && transition.name == transitonName && transition.id !== transitionId) {
            if (transition.fromState == fromState && transition.name == transitonName && transition.id !== transitionId) {
                tmp = true;
            }
        }
        return tmp;
    };

    $scope.getNextTransitionName = function (fromState) {
        var namesArray = [];
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            if ($scope.config.transitions[i].fromState == fromState) {
                namesArray.push($scope.config.transitions[i].name);
            }
        }
        var foundNextName = false;
        var tryChar = "a";
        while (!foundNextName) {
            var value = _.indexOf(namesArray, tryChar);
            if (value === -1) {
                foundNextName = true;
            } else {
                tryChar = String.fromCharCode(tryChar.charCodeAt() + 1);
            }
        }
        return tryChar;

    };

    /**
     * Adds a transition at the end of the transitions array
     * @param {number} fromState      The id from the fromState
     * @param {number} toState        The id from the toState
     * @param {String} transistonName The name of the Transition
     */
    $scope.addTransition = function (fromState, toState, transitonName) {
        //can only create the transition if it is unique-> not for the ndfa
        //there must be a fromState and toState, before adding a transition
        if (!$scope.existsTransition(fromState, toState, transitonName) && $scope.existsStateWithId(fromState) &&
            $scope.existsStateWithId(toState)) {
            $scope.addToAlphabet(transitonName);
            return $scope.addTransitionWithId($scope.config.countTransitionId++, fromState, toState, transitonName);

        } else {
            //TODO: BETTER DEBUG
        }
    };

    /**
     * Adds a transition at the end of the transitions array -> for import 
     * !!!dont use at other places!!!!! ONLY FOR IMPORT
     * @param {number} fromState      The id from the fromState
     * @param {number} toState        The id from the toState
     * @param {String} transistonName The name of the Transition
     */
    $scope.addTransitionWithId = function (transitionId, fromState, toState, transitonName) {
        $scope.config.transitions.push(new TransitionDFA(transitionId, fromState, toState, transitonName));

        //drawTransistion
        $scope.statediagram.drawTransition(transitionId);
        $scope.updateListener();
        //fix changes wont update after addTransisiton from the statediagram
        $scope.safeApply();
        return $scope.getTransitionById(transitionId);
    };

    /**
     * Get the array index from the transition with the given transitionId
     * @param  {number} transitionId 
     * @return {number}         Returns the index and -1 when state with transistionId not found
     */
    $scope.getArrayTransitionIdByTransitionId = function (transitionId) {
        return _.findIndex($scope.config.transitions, function (transition) {
            if (transition.id == transitionId) {
                return transition;
            }
        });
    };

    /**
     * Returns the transition of the given transitionId
     * @param  {number} transitionId 
     * @return {object}        Returns the objectreference of the state
     */
    $scope.getTransitionById = function (transitionId) {
        return $scope.config.transitions[$scope.getArrayTransitionIdByTransitionId(transitionId)];
    };

    /**
     * Checks if a transition with the params already exists
     * @param  {number}  fromState      Id of the fromstate
     * @param  {number}  toState        id from the toState
     * @param  {Strin}  transitonName The name of the transition
     * @return {Boolean}                
     */
    $scope.getTransition = function (fromState, toState, transitonName) {
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var transition = $scope.config.transitions[i];
            if (transition.fromState == fromState && transition.toState == toState && transition.name == transitonName) {
                return transition;
            }
        }
        return undefined;
    };


    /**
     * Removes the transistion
     * @param {number} transitionId      The id from the transition
     */
    $scope.removeTransition = function (transitionId) {
        //remove old transition from alphabet if this transition only used this char
        $scope.removeFromAlphabetIfNotUsedFromOthers(transitionId);
        //first remove the element from the svg after that remove it from the array
        $scope.statediagram.removeTransition(transitionId);
        $scope.config.transitions.splice($scope.getArrayTransitionIdByTransitionId(transitionId), 1);
        //update other listeners when remove is finished
        $scope.updateListener();
    };

    /**
     * Renames a transition if is uniqe with the new name
     * @param  {number} transitionId     
     * @param  {String} newTransitionName 
     */
    $scope.renameTransition = function (transitionId, newTransitionName) {
        var transition = $scope.getTransitionById(transitionId);
        if (!$scope.existsTransition(transition.fromState, transition.toState, newTransitionName)) {
            var tmpTransition = $scope.getTransitionById(transitionId);
            //remove old transition from alphabet if this transition only used this char
            $scope.removeFromAlphabetIfNotUsedFromOthers(transitionId);
            //add new transitionname to the alphabet
            $scope.addToAlphabet(newTransitionName);
            //save the new transitionname
            $scope.getTransitionById(transitionId).name = newTransitionName;
            //Rename the state on the statediagram
            $scope.statediagram.renameTransition(transition.fromState, transition.toState, transitionId, newTransitionName);
            $scope.updateListener();
            return true;
        } else {
            //TODO: BETTER DEBUG
            return false;
        }
    };
}
//Simulator for the simulation of the automata
function SimulationDFA($scope) {
    "use strict";
    var self = this;

    //saves if the animation is in playmode
    self.isInPlay = false;
    //if the simulation loops (start at the end again)
    self.loopSimulation = true;
    //time between the steps
    self.stepTimeOut = 1500;
    //Time between loops when the animation restarts
    self.loopTimeOut = 2000;
    //if the simulation is paused
    self.simulationPaused = false;
    //simulationsettings
    self.simulationSettings = true;

    //
    self.currentState = null;
    self.nextState = null;
    self.transition = null;


    //
    self.isInputAccepted = false;

    self.settings = function () {
        self.simulationSettings = !self.simulationSettings;
    };
    self.animated = {
        currentState: null,
        transition: null,
        nextState: null
    };

    /**
     * Should reset the simulation
     */
    self.reset = function () {
        //reset animation
        self.animated = {
            currentState: null,
            transition: null,
            nextState: null
        };
        //stack of the gone transitions
        self.goneTransitions = [];
        //Animation Settings
        //saves the currentStateId -> for animating
        self.currentState = $scope.config.startState;
        //saves the nextTransition for animating
        self.transition = null;
        //saves if the transition is animated
        self.animatedTransition = false;
        //saves the nextState for animating
        self.nextState = null;
        //saves if the nextState is animated
        self.animatedNextState = false;
        //saves if we already calculated the next step
        self.isNextStepCalculated = false;
        //saves if the simulationStarted
        self.simulationStarted = false;

        //Simulation Settings
        //saves the States we gone through
        self.statusSequence = [$scope.config.startState];
        //saves the steps we made T.
        self.madeSteps = 0;
        //the word we want to check
        self.inputWord = $scope.config.inputWord;
        //the word we already checked
        self.processedWord = '';
        //the char we checked at the step
        self.nextChar = '';
        //the status is stopped at when resetted
        self.status = 'stopped';
    };

    /**
     * Pause the simulation
     */
    self.pause = function () {
        if (!self.simulationPaused) {
            self.simulationPaused = true;
            self.isInPlay = false;
        }
    };

    /**
     * Stops the simulation
     */
    self.stop = function () {
        self.pause();
        self.reset();
    };

    /**
     * Play the simulation
     */
    self.play = function () {

        //if the simulation is paused then return
        if (!self.simulationPaused) {
            //start and prepare for the play
            if (!self.simulationStarted) {
                self.prepareSimulation();
            } else {
                //loop through the steps
                if (self.isNextStepCalculated || ((self.status != 'accepted') && (self.status != 'not accepted'))) {
                    self.animateNextMove();
                    $scope.safeApply(function () {});
                    if (self.isNextStepCalculated || ((self.status != 'accepted') && (self.status != 'not accepted'))) {
                        setTimeout(self.play, self.stepTimeOut);
                    }
                }
                //end the animation & reset it if loop through is activated the animation loop throuh play
                if (!self.isNextStepCalculated && self.status == 'accepted') {
                    if (self.loopSimulation) {
                        setTimeout(self.play, self.loopTimeOut);
                        //finish the Animation
                    } else {
                        self.isInPlay = false;
                    }
                    self.simulationStarted = false;
                    $scope.safeApply(function () {});
                }
            }
        } else {
            return;
        }
    };

    /**
     * Prepare the simulation ( set startSettings)
     */
    self.prepareSimulation = function () {
        //The simulation always resets the parameters at the start -> it also sets the inputWord
        self.reset();
        self.simulationStarted = true;
        self.animated.currentState = _.last(self.statusSequence);

        $scope.safeApply();
        setTimeout(self.play, self.loopTimeOut);
    };

    /**
     * animate the next Move (a step has more than three moves)
     */
    self.animateNextMove = function () {
        if (!self.isNextStepCalculated) {
            self.calcNextStep();
        }

        //First: Paint the transition & wait
        if (!self.animatedTransition) {
            self.animatedTransition = true;
            self.animated.transition = self.transition;
            self.goneTransitions.push(self.transition);

            //Second: Paint the nextstate & wait
        } else if (!self.animatedNextState && self.animatedTransition) {
            self.animatedNextState = true;
            self.animated.nextState = self.nextState;


            //Third: clear transition & currentStatecolor and set currentState = nexsttate and wait
        } else if (self.animatedTransition && self.animatedNextState) {
            self.animated.transition = null;
            self.animated.nextState = null;
            self.animated.currentState = self.nextState;

            self.currentState = self.nextState;
            //after the step was animated it adds a step to the madeSteps
            self.madeSteps++;
            //if the nextState is the finalState
            if (self.inputWord.length == self.madeSteps) {
                if (_.include($scope.config.finalStates, self.currentState)) {
                    self.status = 'accepted';
                } else {
                    self.status = 'not accepted';
                }
            }



            //Reset the step & start the next step
            self.isNextStepCalculated = false;
            self.animatedNextState = false;
            self.animatedTransition = false;
            self.processedWord += self.nextChar;

            //push the currentState to the statusSequence
            self.statusSequence.push(self.currentState);

            //check if there is a next transition
            if (self.status !== "accepted" && self.status !== "not accepted")
                self.calcNextStep();
        }

    };

    /**
     * calcs the next step
     */
    self.calcNextStep = function () {
        self.isNextStepCalculated = true;
        self.status = 'step';
        self.nextChar = self.inputWord[self.madeSteps];

        //get the next transition
        self.transition = _.filter($scope.config.transitions, function (transition) {
            //if there is no next char then the word is not accepted
            if (self.nextChar === undefined) {
                self.status = 'not accepted';
                return;
            }
            //get the nextState
            return transition.fromState == _.last(self.statusSequence) && transition.name == self.nextChar;
        });
        //if there is no next transition, then the word is not accepted
        if (_.isEmpty(self.transition)) {
            self.transition = null;
            self.status = 'not accepted';
            return;
        }
        //save transition and nextState for the animation
        self.transition = self.transition[0];
        self.nextState = self.transition.toState;
    };

    /**
     * pause the simulation and then stepForward steps to the nextAnimation ( not a whole step)
     */
    self.stepForward = function () {
        if (!self.simulationPaused) {
            self.pause();
        }
        if (!self.simulationStarted) {
            self.prepareSimulation();
            self.status = 'step';
            // return if automat is not running
        } else if (!(_.include(['step', 'stopped', 'accepted', 'not accepted'], self.status))) {
            //TODO:DEBUG
            console.log(self.status);
            return;
        } else if (!_.include(['accepted', 'not accepted'], self.status)) {
            self.animateNextMove();
        }
    };


    /**
     * pause the simulation and then steps back to the lastAnimation ( not a whole step)
     * @return {[type]} [description]
     */
    self.stepBackward = function () {
        if (!self.simulationPaused) {
            self.pause();
        }
        // return if automat is not running
        if (!(_.include(['step', 'accepted', 'not accepted'], self.status))) {
            //TODO:DEBUG
            return;
        }
        self.status = 'step';

        // Reset if no more undoing is impossible n-> not right at the moment
        if (!self.animatedTransition && !self.animatedNextState && self.madeSteps === 0) {
            self.reset();
        } else {
            // Decrease count and remove last element from statusSequence
            self.animateLastMove();
        }
    };

    /**
     * animates the last move if there is no lastmove, then calcLastStep
     * @return {[type]} [description]
     */
    self.animateLastMove = function () {
        console.log(self.animatedTransition + " " + self.animatedNextState);
        if (self.animatedTransition && self.animatedNextState) {
            self.animated.nextState = null;
            self.animatedNextState = false;
        } else if (self.animatedTransition) {
            self.animated.transition = null;
            self.animatedTransition = false;
            self.goneTransitions.pop();
        } else {
            self.calcLastStep();
        }

    };

    /**
     * calc the last step
     */
    self.calcLastStep = function () {
        self.nextChar = self.processedWord.slice(-1);
        console.log(self.nextChar + " " + self.statusSequence[self.statusSequence.length - 2]);

        //get the gone way back
        self.transition = _.last(self.goneTransitions);
        console.log(self.transition);
        _.pullAt(self.goneTransitions, self.goneTransitions.length);
        //First: Paint the transition & wait
        self.animatedTransition = true;
        self.animated.transition = self.transition;
        var tmp = self.currentState;
        self.currentState = self.transition.fromState;
        self.nextState = tmp;
        self.animated.nextState = self.nextState;
        //Second: Paint the nextstate & wait
        self.animatedNextState = true;

        self.animated.currentState = self.currentState;
        self.madeSteps--;
        self.statusSequence.splice(-1, 1);
        self.processedWord = self.processedWord.slice(0, -1);
    };

    self.getNextTransition = function (fromState, transitonName) {
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var transition = $scope.config.transitions[i];
            if (transition.fromState == fromState && transition.name == transitonName) {
                return transition;
            }
        }
        return undefined;
    };
    /**
     * checks if a word is accepted from the automata
     * @return {Boolean} [description]
     */
    self.check = function () {
        //init needed variables
        var accepted = false;
        var statusSequence = [];
        statusSequence.push($scope.config.startState);
        var nextChar = '';
        var madeSteps = 0;
        var transition = null;

        while (madeSteps <= $scope.config.inputWord.length) {
            nextChar = $scope.config.inputWord[madeSteps];
            //get the next transition
            transition = self.getNextTransition(_.last(statusSequence), nextChar);
            //if there is no next transition, then the word is not accepted
            if (_.isEmpty(transition)) {
                break;
            }
            //push the new State to the sequence
            statusSequence.push(transition.toState);
            madeSteps++;
            //if outmadeSteps is equal to the length of the inputWord 
            //and our currenState is a finalState then the inputWord is accepted, if not its not accepted
            if ($scope.config.inputWord.length == madeSteps) {
                if (_.include($scope.config.finalStates, _.last(statusSequence))) {
                    accepted = true;
                    break;
                } else {
                    break;
                }
            }
        }
        return accepted;
    };


    //BUTTONS NEED DIRECTIVES
    /**
     *  Checks if the automata is playable ( has min. 1 states and 1 transition and automat has a start and a finalstate)
     * @return {Boolean} [description]
     */
    self.isPlayable = function () {
        return $scope.config.states.length >= 1 && $scope.config.transitions.length >= 1 && $scope.config.startState !== null && $scope.config.finalStates.length >= 1;
    };

    /**
     * [playOrPause description]
     * @return {[type]} [description]
     */
    self.playOrPause = function () {
        //the automat needs to be playable
        if (self.isPlayable()) {
            //change the icon and the state to Play or Pause
            self.isInPlay = !self.isInPlay;
            if (self.isInPlay) {
                self.simulationPaused = false;
                self.play();
            } else {
                self.pause();
            }

        } else {
            //$scope.dbug.debugDanger("Kein Automat vorhanden!");
        }

    };

    $scope.updateListeners.push(self);
    self.updateFunction = function () {
        self.isInputAccepted = self.check();
    };




}
//statediagram for the svg diagramm
function StateDiagramDFA($scope, svgSelector) {
    "use strict";

    var self = this;

    self.preventStateDragging = false;
    self.inAddTransition = false;
    self.selectedState = null;

    //prevents call from the svouterclicklistener
    self.preventSvgOuterClick = false;
    self.selectedTransition = null;
    self.showStateMenu = false;
    self.showTransitionMenu = false;
    self.selectedStateName = "selectedForTransition";
    //user can snap the states to the grid -> toggles snapping
    self.snapping = true;

    //statediagram settings
    self.settings = {
        stateRadius: 25,
        finalStateRadius: 29,
        selected: false
    };
    //is for the selfReference
    var stretchX = 40;
    var stretchY = 18;

    //for the selfReference transition
    self.stateSelfReferenceNumber = Math.sin(45 * (Math.PI / 180)) * self.settings.stateRadius;

    /**
     * Check if transition already drawn
     * @param   {number}  fromState 
     * @param   {number}  toState   
     * @returns {boolean}
     */
    self.existsDrawnTransition = function (fromState, toState) {

        var tmp = false;
        for (var i = 0; i < $scope.config.drawnTransitions.length; i++) {
            var transition = $scope.config.drawnTransitions[i];
            if (transition.fromState == fromState && transition.toState == toState) {
                tmp = true;
            }
        }
        return tmp;
    };

    /**
     * Get a drawn Transition
     * @param   {number} fromState 
     * @param   {number} toState   
     * @returns {object} 
     */
    self.getDrawnTransition = function (fromState, toState) {
        for (var i = 0; i < $scope.config.drawnTransitions.length; i++) {
            var transition = $scope.config.drawnTransitions[i];
            if (transition.fromState == fromState && transition.toState == toState) {
                return transition;
            }
        }
        return undefined;
    };

    /**
     * Clears the svgContent, resets scale and translate and delete drawnTransitionContent
     */
    self.clearSvgContent = function () {
        //first close Menus
        self.closeStateMenu();
        self.closeTransitionMenu();
        //Clear the content of the svg
        self.svgTransitions.html("");
        self.svgStates.html("");
        $scope.config.drawnTransitions = [];
        //change the scale and the translate to the defaultConfit
        self.svg.attr("transform", "translate(" + $scope.defaultConfig.diagramm.x + "," + $scope.defaultConfig.diagramm.y + ")" + " scale(" + $scope.defaultConfig.diagramm.scale + ")");
        svgOuterZoomAndDrag.scale($scope.defaultConfig.diagramm.scale);
        svgOuterZoomAndDrag.translate([$scope.defaultConfig.diagramm.x, $scope.defaultConfig.diagramm.y]);

    };

    /****ZOOMHANDLER START***/
    //amount the user can zoom out
    self.zoomMax = 2.5;
    //amount the user can zoom in
    self.zoomMin = 0.5;
    self.zoomValue = 0.1;

    self.zoomIn = function () {
        $scope.config.diagramm.scale = ($scope.config.diagramm.scale + self.zoomValue) > self.zoomMax ? $scope.config.diagramm.scale : Math.floor(($scope.config.diagramm.scale + self.zoomValue) * 100) / 100;
        self.updateZoomBehaviour();
    };
    self.zoomOut = function () {

        $scope.config.diagramm.scale = ($scope.config.diagramm.scale - self.zoomValue) <= self.zoomMin ? $scope.config.diagramm.scale : Math.floor(($scope.config.diagramm.scale - self.zoomValue) * 100) / 100;
        self.updateZoomBehaviour();

    };

    /**
     * This method zooms the svg to a specific scale
     * @param {number} value the zoom value
     */
    self.zoomTo = function (value) {
        console.log("zoomtedto");
        $scope.config.diagramm.scale = value / 100;
        $scope.safeApply();
        self.updateZoomBehaviour();
    };

    /**
     * This method updates the d3 zoombehaviour (fixes weird bugs)
     */
    self.updateZoomBehaviour = function () {
        $scope.safeApply();
        self.svg.attr("transform", "translate(" + $scope.config.diagramm.x + "," + $scope.config.diagramm.y + ")" + " scale(" + $scope.config.diagramm.scale + ")");
        svgOuterZoomAndDrag.scale($scope.config.diagramm.scale);
        svgOuterZoomAndDrag.translate([$scope.config.diagramm.x, $scope.config.diagramm.y]);
    };

    /**
     * This method zooms the svg to a calculated scale, so the complete svg fits in the window
     */
    self.zoomFitWindow = function () {
        var stateXCoor = [];
        var stateYCoor = [];
        var minX = 0;
        var maxX = 0;
        var minY = 0;
        var maxY = 0;
        var topShifting = 0;
        var leftShifting = 0;
        var i;
        var obj;
        var width = self.svgOuter.style("width").replace("px", "");
        var height = self.svgOuter.style("height").replace("px", "");

        /*
         * set the diagrammscale on 100%. We got the advantage, that the method also zoom in, if the automaton doesn't fit the window. 
         * But the method doesn't really zoom in. It sets the scale on 100% an then zoom out.
         */
        $scope.config.diagramm.scale = 1.0;

        /**
         * check if there exist at least one state. If the diagram is empty, there is nothing to fit the window.
         * The state with the lowest x- and y-coordinate defines the minimum-x- and minimum-y-coordinate from the automaton.
         * The state with the highest x- and y-coordinate defines the maximum-x- and maximum-y-coordiante from the automaten
         */

        if ($scope.config.states.length > 0) {
            for (i = 0; i < $scope.config.states.length; i++) {
                stateXCoor[i] = $scope.config.states[i].x;
            }

            for (i = 0; i < $scope.config.states.length; i++) {
                stateYCoor[i] = $scope.config.states[i].y;
            }
            minX = _.min(stateXCoor);
            maxX = _.max(stateXCoor);
            minY = _.min(stateYCoor);
            maxY = _.max(stateYCoor);

            /* 
             * While the size of the automaton is bigger than the diagram, zoom out. 
             * We work with the width and the height from the diagram proportional to the scale.
             */
            while (((maxX - minX + 150) > (width / $scope.config.diagramm.scale)) || ((maxY - minY + 200) > (height / $scope.config.diagramm.scale))) {
                $scope.config.diagramm.scale -= 0.01;
            }
            $scope.safeApply();

            //Calculation of a topshifting and a leftshifting, so the automaton is centered in the diagram.
            topShifting = (((height / $scope.config.diagramm.scale) - (maxY - minY)) / 2);
            leftShifting = (((width / $scope.config.diagramm.scale) - (maxX - minX)) / 2);

            //set the diagram-x and -y values and update the diagram.
            $scope.config.diagramm.x = -(minX * $scope.config.diagramm.scale) + (leftShifting * $scope.config.diagramm.scale);
            $scope.config.diagramm.y = -(minY * $scope.config.diagramm.scale) + (topShifting * $scope.config.diagramm.scale);
            self.updateZoomBehaviour();
        } else {
            self.scaleAndTranslateToDefault();
        }
    };

    /**
     * Scale and Translate the Svg to the default Value
     */
    self.scaleAndTranslateToDefault = function () {
        $scope.config.diagramm.scale = $scope.defaultConfig.diagramm.scale;
        $scope.config.diagramm.x = $scope.defaultConfig.diagramm.x;
        $scope.config.diagramm.y = $scope.defaultConfig.diagramm.y;
        $scope.safeApply();
        self.updateZoomBehaviour();
    };

    //the svgouterzoom and drag listener
    var svgOuterZoomAndDrag = d3.behavior
        .zoom()
        .scaleExtent([self.zoomMin, self.zoomMax])
        .on("zoom", function () {
            var stop = d3.event.button || d3.event.ctrlKey;
            if (stop) d3.event.stopImmediatePropagation(); // stop zoom
            //dont translate on right click (3)
            if (d3.event.sourceEvent.which !== 3) {
                var newScale = Math.floor(d3.event.scale * 100) / 100;

                $scope.config.diagramm.scale = newScale;
                $scope.config.diagramm.x = d3.event.translate[0];
                $scope.config.diagramm.y = d3.event.translate[1];
                $scope.safeApply();
                self.svg.attr("transform", "translate(" + $scope.config.diagramm.x + "," + $scope.config.diagramm.y + ")" + " scale(" + $scope.config.diagramm.scale + ")");
            } else {
                console.log("rightclick!");
            }
        });


    //prevents the normal rightclickcontextmenu and add zoom
    self.svgOuter = d3.select(svgSelector)
        .call(svgOuterZoomAndDrag)
        //prevents doubleclick zoom
        .on("dblclick.zoom", null)
        //adds our custom context menu on rightclick
        .on("contextmenu", function () {
            d3.event.preventDefault();
        });

    /**
     * Click Listener when clicking on the outer svg =(not clicking on state or transition)
     */
    self.addSvgOuterClickListener = function () {
        self.svgOuter.on("click", function () {
            if (!self.preventSvgOuterClick) {
                self.closeStateMenu();
                self.closeTransitionMenu();
                $scope.safeApply();
            } else {
                //remove clickbool
                self.preventSvgOuterClick = false;
            }
        });
    };

    //add at the start
    self.addSvgOuterClickListener();

    //the html element where we put the svgGrid into
    self.svgGrid = self.svgOuter.append("g").attr("id", "grid");

    //inner svg
    self.svg = self.svgOuter
        .append("g")
        .attr("id", "svg-items");


    //first draw the transitions -> nodes are in front of them if they overlap
    self.svgTransitions = self.svg.append("g").attr("id", "transitions");
    self.svgStates = self.svg.append("g").attr("id", "states");



    //the space between each SnappingPoint 1:(0,0)->2:(0+gridSpace,0+gridSpace)
    self.gridSpace = 100;
    //the distance when the state is snapped to the next SnappingPoint (Rectangle form)
    self.gridSnapDistance = 20;
    //is Grid drawn
    self.isGrid = true;

    //watcher for the grid when changed -> updateGrid
    $scope.$watch('[statediagram.isGrid , config.diagramm]', function () {
        self.drawGrid();
    }, true);

    /**
     * Draw the Grid
     */
    self.drawGrid = function () {
        if (self.isGrid) {
            //clear grid
            self.svgGrid.html("");
            var width = self.svgOuter.style("width").replace("px", "");
            var height = self.svgOuter.style("height").replace("px", "");
            var thickness = 1 * $scope.config.diagramm.scale * 0.5;
            var xOffset = ($scope.config.diagramm.x % (self.gridSpace * $scope.config.diagramm.scale));
            var yOffset = ($scope.config.diagramm.y % (self.gridSpace * $scope.config.diagramm.scale));
            var i;
            //xGrid
            for (i = xOffset; i < width; i += self.gridSpace * $scope.config.diagramm.scale) {
                self.svgGrid
                    .append("line")
                    .attr("stroke-width", thickness)
                    .attr("class", "grid-line xgrid-line")
                    .attr("x1", i)
                    .attr("y1", 0)
                    .attr("x2", i)
                    .attr("y2", height);
            }
            //yGrid
            for (i = yOffset; i < height; i += self.gridSpace * $scope.config.diagramm.scale) {
                self.svgGrid
                    .append("line")
                    .attr("stroke-width", thickness)
                    .attr("class", "grid-line ygrid-line")
                    .attr("x1", 0)
                    .attr("y1", i)
                    .attr("x2", width)
                    .attr("y2", i);
            }
        } else {
            //undraw Grid
            self.svgGrid.html("");
        }
    };


    //DEFS
    self.defs = self.svg.append('svg:defs');
    //Marker-Arrow ( for the transitions)
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-create')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-animated')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-hover')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-selection')
        .attr('refX', 4)
        .attr('refY', 3)
        .attr('markerWidth', 5)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');


    /**
     * Reset all the AddListeners
     */
    self.resetAddActions = function () {
        self.closeStateMenu();
        self.closeTransitionMenu();
        self.svgOuter.on("click", null);
        self.inAddTransition = false;
        self.inAddState = false;
    };

    /**
     * AddState -> creates a new state when clicked on the button with visual feedback
     */
    self.addState = function () {
        self.resetAddActions();
        //add listener that the selectedstate follows the mouse
        self.svgOuter.on("mousemove", function () {
            //move the state (only moved visually not saved)
            self.selectedState.objReference.attr("transform", "translate(" + (((d3.mouse(this)[0]) - $scope.config.diagramm.x) * (1 / $scope.config.diagramm.scale)) + " " +
                (((d3.mouse(this)[1]) - $scope.config.diagramm.y) * (1 / $scope.config.diagramm.scale)) + ")");
        });
        //create a new selectedState in a position not viewable
        self.selectedState = $scope.addStateWithPresets(-10000, -10000);
        //add a class to the state (class has opacity)
        self.selectedState.objReference.classed("state-in-creation", true);
        self.svgOuter.on("click", function () {
            //remove class
            self.selectedState.objReference.classed("state-in-creation", false);
            //update the stateData
            self.selectedState.x = (((d3.mouse(this)[0]) - $scope.config.diagramm.x) * (1 / $scope.config.diagramm.scale));
            self.selectedState.y = (((d3.mouse(this)[1]) - $scope.config.diagramm.y) * (1 / $scope.config.diagramm.scale));
            self.selectedState.objReference.attr("transform", "translate(" + self.selectedState.x + " " + self.selectedState.y + ")");
            //remove mousemove listener
            self.svgOuter.on("mousemove", null);
            //overwrite the click listener
            self.addSvgOuterClickListener();
            self.preventSvgOuterClick = false;
            $scope.safeApply();

        });
    };

    /**
     * Addtransition function for the icon
     */
    self.addTransition = function () {
        self.resetAddActions();
        //prevent dragging during addTransition
        self.preventStateDragging = true;
        //1. FirstClick: select a state and create a tmpLine for visual feedback
        //SecondClick: Create a transition from selectState to the clickedState
        d3.selectAll(".state").on("click", function () {
            self.mouseInState = true;
            //if there is no selected state then select a state
            if (self.selectedState === null) {
                self.selectedState = $scope.getStateById(parseInt(d3.select(this).attr("object-id")));
                self.toggleState(self.selectedState.id, true);

                //create tmpLine
                self.tmpTransition = self.svgTransitions.append("g")
                    .attr("class", "transition");
                //the line itself with the arrow without the path itself
                self.tmpTransitionline = self.tmpTransition.append("path")
                    .attr("class", "transition-line curvedLine in-creation")
                    .attr("marker-end", "url(#marker-end-arrow-create)")
                    .attr("fill", "none");

                //if already selected a state then create transition to the clickedState
            } else {
                var tmpTransition = $scope.addTransition(self.selectedState.id, parseInt(d3.select(this).attr("object-id")), $scope.getNextTransitionName(self.selectedState.id));
                self.toggleState(self.selectedState.id, false);
                self.tmpTransition.remove();
                self.tmpTransition = null;
                self.tmpTransitionline = null;
                self.preventStateDragging = false;
                //update the svgOuter listeners
                self.addSvgOuterClickListener();
                self.svgOuter.on("mousemove", null);
                //update state listeners
                d3.selectAll(".state").on("mouseover", null);
                d3.selectAll(".state").on("mouseleave", null);
                d3.selectAll('.state').on('click', self.openStateMenu);

                //openTransitionMenu
                self.openTransitionMenu(tmpTransition.id);
            }

        });
        //2. if the mouse moves on the svgOuter and not on a state, then update the tmpLine
        self.svgOuter.on("mousemove", function () {
            if (!self.mouseInState && self.selectedState !== null) {
                var x = (((d3.mouse(this)[0]) - $scope.config.diagramm.x) * (1 / $scope.config.diagramm.scale));
                var y = (((d3.mouse(this)[1]) - $scope.config.diagramm.y) * (1 / $scope.config.diagramm.scale));
                var pathLine = self.bezierLine([[self.selectedState.x, self.selectedState.y], [x, y]]);
                self.tmpTransitionline.attr("d", pathLine);
            }
        });

        //3. if the mouse moves on a state then give a visual feedback how the line connects with the state
        d3.selectAll(".state").on("mouseover", function (i) {
            //see 2.
            self.mouseInState = true;
            //we need an other state to connect the line
            if (self.selectedState !== null) {
                var otherState = $scope.getStateById(d3.select(this).attr("object-id"));
                var transition = {};
                transition.fromState = self.selectedState.id;
                transition.toState = otherState.id;
                var line = self.tmpTransitionline;
                if (!self.existsDrawnTransition(self.selectedState.fromState, self.selectedState.toState)) {
                    //the group element
                    //if it is not a self Reference
                    if (transition.fromState != transition.toState) {
                        var drawConfig = self.getTransitionDrawConfig(transition);
                        //if there is a transition in the other direction
                        if (drawConfig.approachTransition) {
                            //other transition in the other direction
                            var otherTrans = self.getDrawnTransition(transition.toState, transition.fromState);
                            var otherDrawConfig = self.getTransitionDrawConfig(otherTrans, true);
                            self.updateTransitionLines(otherTrans.objReference, otherDrawConfig.path);
                            otherTrans.objReference.select(".transition-text")
                                .attr("x", otherDrawConfig.xText)
                                .attr("y", otherDrawConfig.yText);
                            //update the transition text position
                            self.otherTransition = otherTrans;

                        }
                        //get the curve data ( depends if there is a transition in the oposite direction)
                        line.attr("d", drawConfig.path);
                        //if it is a selfreference
                    } else {
                        var stateId = $scope.getArrayStateIdByStateId(transition.fromState);
                        var x = $scope.config.states[stateId].x;
                        var y = $scope.config.states[stateId].y;
                        line.attr("d", self.selfTransition(x, y));
                    }
                    //if there is already a transition with the same fromState and toState then the current
                } else {
                    //add the name to the drawnTransition
                    var drawnTransition = self.getDrawnTransition(transition.fromState, transition.toState);
                    drawnTransition.names.push(transition.name);
                    //drawn the new name to the old transition (svg)
                    self.writeTransitionText(drawnTransition.objReference.select(".transition-text"), drawnTransition.names);


                }
                self.tmpTransitionline.attr("x1", self.selectedState.x)
                    .attr("y1", self.selectedState.y)
                    .attr("x2", otherState.x)
                    .attr("y2", otherState.y);
            }
        }).on("mouseleave", function () {
            self.mouseInState = false;
            //remove the visual feedback from transition going against our tmpLine
            if (self.otherTransition !== null && self.otherTransition !== undefined) {
                var otherDrawConfig = self.getTransitionDrawConfig(self.otherTransition);
                self.updateTransitionLines(self.otherTransition.objReference, otherDrawConfig.path);
                self.otherTransition.objReference.select(".transition-text")
                    .attr("x", (otherDrawConfig.xText))
                    .attr("y", (otherDrawConfig.yText));
            }
        });
    };

    /**
     * Renames the state in the svg after the $scope variable was changed
     * @param  {number} stateId      
     * @param  {String} newStateName          
     */
    self.renameState = function (stateId, newStateName) {
        var state = $scope.config.states[$scope.getArrayStateIdByStateId(stateId)];
        var objReference = state.objReference;
        objReference.select("text").text(newStateName);
    };

    /**
     * Removes the state with the given id
     * @param  {number} stateId 
     */
    self.removeState = function (stateId) {
        self.closeStateMenu();
        var state = $scope.config.states[$scope.getArrayStateIdByStateId(stateId)];
        var objReference = state.objReference;
        objReference.remove();
    };


    /**
     * Renames a transition
     * @param {number} fromState         the fromStateId
     * @param {number} toState           the toStateID
     * @param {number} transitionId      the transitionid
     * @param {char}   newTransitionName the new transitionname
     */
    self.renameTransition = function (fromState, toState, transitionId, newTransitionName) {
        //change it in drawnTransition
        var drawnTransition = self.getDrawnTransition(fromState, toState);
        var drawnTransitionName = _.find(drawnTransition.names, {
            "id": transitionId
        });
        drawnTransitionName.name = newTransitionName;

        //change it on the svg
        self.writeTransitionText(drawnTransition.objReference.select(".transition-text"), drawnTransition.names);
    };


    /**
     * removes a transition from the svg
     * @param   {number}   transitionId
     */
    self.removeTransition = function (transitionId) {
        var tmpTransition = $scope.getTransitionById(transitionId);
        var tmpDrawnTransition = self.getDrawnTransition(tmpTransition.fromState, tmpTransition.toState);
        var drawConfig = self.getTransitionDrawConfig(tmpTransition);
        self.closeTransitionMenu();
        //if its the only transition in the drawn transition -> then remove the drawn transition
        if (tmpDrawnTransition.names.length === 1) {
            tmpDrawnTransition.objReference.remove();
            _.remove($scope.config.drawnTransitions, function (n) {
                return n == tmpDrawnTransition;
            });
            //if there is an approad transition, then draw it with the new drawconfig
            if (drawConfig.approachTransition) {
                //other transition in the other direction
                var otherTrans = self.getDrawnTransition(tmpTransition.toState, tmpTransition.fromState);
                var otherDrawConfig = self.getTransitionDrawConfig(otherTrans, false);
                self.updateTransitionLines(otherTrans.objReference, otherDrawConfig.path);
                otherTrans.objReference.select(".transition-text")
                    .attr("x", otherDrawConfig.xText)
                    .attr("y", otherDrawConfig.yText);
                //update the transition text position
                self.otherTransition = otherTrans;

            }
        }
        //if there are other transitions with the same from- and tostate, then remove the transition from the names and redraw the text
        else {
            _.remove(tmpDrawnTransition.names, function (n) {
                return n.id == tmpTransition.id;
            });
            self.writeTransitionText(tmpDrawnTransition.objReference.select(".transition-text"), tmpDrawnTransition.names);
            drawConfig = self.getTransitionDrawConfig(tmpTransition);
            tmpDrawnTransition.objReference.select(".transition-text")
                .attr("x", drawConfig.xText)
                .attr("y", drawConfig.yText);
            console.log(tmpDrawnTransition);

            self.openTransitionMenu(tmpDrawnTransition.names[tmpDrawnTransition.names.length - 1].id);

        }


    };

    /**
     * Adds a stateId to the final states on the svg (visual feedback)
     * @param {number} stateId
     */
    self.addFinalState = function (stateId) {
        var state = $scope.getStateById(stateId);
        state.objReference.insert("circle", ".state-circle")
            .attr("class", "final-state")
            .attr("r", self.settings.finalStateRadius);

        //TODO: update the transitions to the state

    };

    /**
     * Removes a final state on the svg
     * @param {number} stateId 
     */
    self.removeFinalState = function (stateId) {
        var state = $scope.getStateById(stateId);
        state.objReference.select(".final-state").remove();
        //TODO update the transitions to the state
    };

    /**
     * Changes the StartState to the stateid
     * @param {number} stateId 
     */
    self.changeStartState = function (stateId) {
        //TODO:
        //remove old startState
        if ($scope.config.startState !== null) {
            var state = $scope.getStateById($scope.config.startState);
            state.objReference.select(".start-line").remove();
        }

        var otherState = $scope.getStateById(stateId);
        otherState.objReference.append("line")
            .attr("class", "transition-line start-line")
            .attr("x1", 0)
            .attr("y1", 0 - 75)
            .attr("x2", 0)
            .attr("y2", 0 - self.settings.stateRadius - 4)
            .attr("marker-end", "url(#marker-end-arrow)");
    };

    /**
     * removes the stateId
     * @param {number} stateId
     */
    self.removeStartState = function (stateId) {
        var state = $scope.getStateById($scope.config.startState);
        state.objReference.select(".start-line").remove();
        $scope.config.startState = null;
        $scope.updateListener();
    };

    /**
     * Draws a State 
     * @param  {number} id the stateid
     * @return {Reference}    Returns the reference of the group object
     */
    self.drawState = function (id) {
        var state = $scope.getStateById(id);
        var group = self.svgStates.append("g")
            .attr("transform", "translate(" + state.x + " " + state.y + ")")
            .attr("class", "state " + "state-" + state.id)
            .attr("object-id", state.id); //save the state-id

        var circle = group.append("circle")
            .attr("class", "state-circle")
            .attr("r", self.settings.stateRadius);
        //for outer circle dotted when selected

        var hoverCircle = group.append("circle")
            .attr("class", "state-circle hover-circle")
            .attr("r", self.settings.stateRadius);

        var text = group.append("text")
            .text(state.name)
            .attr("class", "state-text")
            .attr("dominant-baseline", "central")
            .attr("text-anchor", "middle");

        state.objReference = group;
        group.on('click', self.openStateMenu)
            .call(self.dragState);
        return group;
    };

    /**
     * Adds or remove a class to a state ( only the svg state)
     * @param {number} stateId 
     * @param {Boolean} state   
     * @param {String} className  
     */
    self.setStateClassAs = function (stateId, state, className) {
        var objReference = $scope.getStateById(stateId).objReference;
        objReference.classed(className, state);
    };

    /**
     * Sets a transition class to a specific class or removes the specific class
     * @param {number}   transitionId
     * @param {boolean} state        if the class should be added or removed
     * @param {string}  className    the classname
     */
    self.setTransitionClassAs = function (transitionId, state, className) {
        var trans = $scope.getTransitionById(transitionId);
        var objReference = self.getDrawnTransition(trans.fromState, trans.toState).objReference;
        objReference.classed(className, state);
        if (state && className == 'animated-transition') {
            objReference.select(".transition-line").attr("marker-end", "url(#marker-end-arrow-animated)");
        } else {
            objReference.select(".transition-line").attr("marker-end", "url(#marker-end-arrow)");
        }
    };

    /**
     * sets the arrow marker of a transition, cause we couldnt change the color of an arrow marker
     * @param {object} transLine the transitionlineobject
     * @param {string} suffix    which arrow should be changed
     */
    self.setArrowMarkerTo = function (transLine, suffix) {

        if (suffix !== '') {
            transLine.select('.transition-line').attr("marker-end", "url(#marker-end-arrow-" + suffix + ")");
        } else {
            transLine.select('.transition-line').attr("marker-end", "url(#marker-end-arrow)");
        }
    };


    /**
     * Opens the StateMenu
     */
    self.openStateMenu = function () {
        console.log("open state menu");
        self.closeStateMenu();
        self.closeTransitionMenu();
        //fixes weird errors
        $scope.safeApply();

        self.preventSvgOuterClick = true;
        self.showStateMenu = true;
        self.selectedState = $scope.getStateById(parseInt(d3.select(this).attr("object-id")));
        //add new state as selected
        self.toggleState(self.selectedState.id, true);

        //save the state values in the state context as default value
        self.input = {};
        self.input.state = self.selectedState;
        self.input.stateName = self.selectedState.name;
        self.input.startState = $scope.config.startState == self.selectedState.id;
        self.input.finalState = $scope.isStateAFinalState(self.selectedState.id);
        self.input.ttt = "";
        self.input.tttisopen = false;
        $scope.safeApply();
        self.stateMenuListener = [];
        //Menu watcher
        self.stateMenuListener.push($scope.$watch('statediagram.input.startState', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                if (self.input.startState) {
                    $scope.changeStartState(self.input.state.id);
                } else {
                    if (self.selectedState.id == $scope.config.startState)
                        $scope.removeStartState();
                }
            }

        }));
        self.stateMenuListener.push($scope.$watch('statediagram.input.finalState', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                if (self.input.finalState) {
                    $scope.addFinalState(self.input.state.id);
                } else {
                    $scope.removeFinalState(self.input.state.id);
                }

            }

        }));
        self.stateMenuListener.push($scope.$watch('statediagram.input.stateName', function (newValue, oldValue) {
            //if the name got changed but is not empty
            //reset the tooltip
            self.input.tttisopen = false;
            if (newValue !== oldValue) {
                //change if the name doesnt exists and isnt empty
                if (newValue !== "" && !$scope.existsStateWithName(newValue)) {
                    var renameError = !$scope.renameState(self.input.state.id, newValue);
                } else if (newValue === "") {
                    //FEEDBACK
                    self.input.tttisopen = true;
                    self.input.ttt = 'STATE_MENU.NAME_TOO_SHORT';
                } else if ($scope.existsStateWithName(newValue, self.input.state.id)) {
                    self.input.tttisopen = true;
                    self.input.ttt = 'STATE_MENU.NAME_ALREADY_EXIST';
                }
            }
        }));
    };

    /**
     * closes the state menu
     */
    self.closeStateMenu = function () {
        //remove old StateMenuListeners
        _.forEach(self.stateMenuListener, function (value, key) {
            value();
        });
        if (self.selectedState !== null) {
            self.toggleState(self.selectedState.id, false);
        }
        self.stateMenuListener = null;
        self.showStateMenu = false;

        //delete input
        self.input = null;
    };

    /**
     * toggle a state
     * @param {number} stateId 
     * @param {bool}   bool
     */
    self.toggleState = function (stateId, bool) {
        self.setStateClassAs(stateId, bool, "active");
        if (bool === false) {
            self.selectedState = null;
        }

    };


    //Node drag and drop behaviour
    self.dragState = d3.behavior.drag()
        .on("dragstart", function () {
            //stops drag bugs when wanted to click
            self.dragAmount = 0;
            d3.event.sourceEvent.stopPropagation();
        })
        .on("drag", function () {

            if (d3.event.sourceEvent.which == 1) {
                if (!self.preventStateDragging) {
                    self.dragAmount++;

                    var x = d3.event.x;
                    var y = d3.event.y;

                    if (self.snapping) {


                        var snapPointX = x - (x % self.gridSpace);
                        var snapPointY = y - (y % self.gridSpace);

                        //check first snapping Point (top left)
                        if (x > snapPointX - self.gridSnapDistance && x < snapPointX + self.gridSnapDistance && y > snapPointY - self.gridSnapDistance && y < snapPointY + self.gridSnapDistance) {
                            x = snapPointX;
                            y = snapPointY;
                            //second snapping point (top right)
                        } else if (x > snapPointX + self.gridSpace - self.gridSnapDistance && x < snapPointX + self.gridSpace + self.gridSnapDistance && y > snapPointY - self.gridSnapDistance && y < snapPointY + self.gridSnapDistance) {
                            x = snapPointX + self.gridSpace;
                            y = snapPointY;
                            //third snapping point (bot left)
                        } else if (x > snapPointX - self.gridSnapDistance && x < snapPointX + self.gridSnapDistance && y > snapPointY + self.gridSpace - self.gridSnapDistance && y < snapPointY + self.gridSpace + self.gridSnapDistance) {
                            x = snapPointX;
                            y = snapPointY + self.gridSpace;
                            //fourth snapping point (bot right)
                        } else if (x > snapPointX + self.gridSpace - self.gridSnapDistance && x < snapPointX + self.gridSpace + self.gridSnapDistance && y > snapPointY + self.gridSpace - self.gridSnapDistance && y < snapPointY + self.gridSpace + self.gridSnapDistance) {
                            x = snapPointX + self.gridSpace;
                            y = snapPointY + self.gridSpace;
                        }
                    }

                    //on drag isnt allowed workaround for bad drags when wanted to click
                    if (self.dragAmount > 1) {

                        //update the shown node
                        d3.select(this)
                            .attr("transform", "translate(" + x + " " + y + ")");
                        //update the node in the array

                        var stateId = d3.select(this).attr("object-id");
                        var tmpState = $scope.getStateById(stateId);
                        //update the state coordinates in the dataobject
                        tmpState.x = x;
                        tmpState.y = y;

                        //update the transitions after dragging a node
                        self.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"));
                    }
                }
            }

        }).on("dragend", function () {
            //save the movement
            if (self.dragAmount > 1) {
                $scope.safeApply();
            }
        });


    /**
     * gets the path for a selftransition
     * @param   {number} x
     * @param   {number} y 
     * @returns {String} path of the selftransition
     */
    self.selfTransition = function (x, y) {
        return self.bezierLine([
                [x - self.stateSelfReferenceNumber, y - self.stateSelfReferenceNumber],
                [x - self.stateSelfReferenceNumber - stretchX, y - self.stateSelfReferenceNumber - stretchY],
                [x - self.stateSelfReferenceNumber - stretchX, y + self.stateSelfReferenceNumber + stretchY],
                [x - self.stateSelfReferenceNumber, y + self.stateSelfReferenceNumber]
            ]);
    };

    /**
     * Crossproduct helper function
     * @param   {object}   a vector
     * @param   {object}   b vector
     * @returns {object}   crossproduct vetor 
     */
    function crossPro(a, b) {

        var vecC = {
            x: a.y * b.z,
            y: -a.x * b.z

        };
        return vecC;
    }

    function toDegrees(angle) {
        return angle * (180 / Math.PI);
    }

    function toRadians(angle) {
        return angle * (Math.PI / 180);
    }

    /**
     * expands a vector with a given factor
     * @param   {object} a      vector
     * @param   {number} factor expandfactor
     * @returns {object} expanded vector
     */
    function expandVector(a, factor) {
        return {
            x: a.x * factor,
            y: a.y * factor
        };
    }

    function fixVectorLength(a) {
        var tmp = 1 / Math.sqrt(a.x * a.x + a.y * a.y);
        return {
            x: a.x * tmp,
            y: a.y * tmp

        };
    }

    function AngleBetweenTwoVectors(a, b) {
        var tmp = (a.x * b.x + a.y * b.y) / (Math.sqrt(a.x * a.x + a.y * a.y) * Math.sqrt(b.x * b.x + b.y * b.y));
        var tmp2 = Math.acos(tmp);
        return {
            val: tmp,
            rad: tmp2,
            degree: toDegrees(tmp2)
        };
    }

    function newAngle(a, b) {
        var dot1 = a.x * b.x + a.y * b.y; //dot product
        var dot2 = a.x * b.y - a.y * b.x; //determinant
        return Math.atan2(dot2, dot1); //atan2(y, x) or atan2(sin, cos)
    }

    var degreeConstant = 30;

    function getAngles(a, b) {
        var angle = toDegrees(newAngle(a, b));
        if (angle < 0) {
            angle = angle + 360;
        }

        var upperAngle = angle + degreeConstant;
        if (upperAngle > 360) {
            upperAngle -= 360;
        }
        var lowerAngle = angle - degreeConstant;
        if (lowerAngle < 0) {
            lowerAngle += 360;
        }

        return {
            angle: angle,
            lowerAngle: lowerAngle,
            upperAngle: upperAngle
        };
    }

    //Get the Path from an array -> for the transition
    self.bezierLine = d3.svg.line()
        .x(function (d) {
            return d[0];
        })
        .y(function (d) {
            return d[1];
        })
        .interpolate("basis");

    /**
     * Returns the transitionDrawConfig with all the data like xstart, xend, xtext....
     * @param   {object}  transition    the transitionobj
     * @param   {boolean} forceApproach if we force an approachedtransition ->needed when the transition was writed to the array, or for the addtransition
     * @returns {object}  the drawConfig
     */
    self.getTransitionDrawConfig = function (transition, forceApproach) {
        //the distance the endPoint of the transition is away from the state
        var gapBetweenTransitionLineAndState = 3;
        var obj = {};

        /**1: Check if there is a transition aproach our transition**/
        obj.approachTransition = forceApproach || self.existsDrawnTransition(transition.toState, transition.fromState);

        /****2. Get the xStart,yStart and xEnd,yEnd  and xMid,yMid***/
        //from and to State
        var fromState = $scope.getStateById(transition.fromState);
        var toState = $scope.getStateById(transition.toState);
        var isToStateAFinalState = $scope.isStateAFinalState(transition.toState);
        //the x and y coordinates
        var x1 = fromState.x;
        var y1 = fromState.y;
        var x2 = toState.x;
        var y2 = toState.y;

        var xCurv1,
            yCurv1,
            xCurv2,
            yCurv2;

        //needed for the calculation of the coordinates
        var directionvector = {
            x: x2 - x1,
            y: y2 - y1
        };
        var directionVectorLength = Math.sqrt(directionvector.x * directionvector.x + directionvector.y * directionvector.y);
        var nStart = self.settings.stateRadius / directionVectorLength;
        var nEnd;
        if (isToStateAFinalState) {
            nEnd = (self.settings.stateRadius + gapBetweenTransitionLineAndState + 5) / directionVectorLength;
        } else {
            nEnd = (self.settings.stateRadius + gapBetweenTransitionLineAndState) / directionVectorLength;
        }

        obj.xStart = x1 + nStart * directionvector.x;
        obj.yStart = y1 + nStart * directionvector.y;

        obj.xEnd = x2 - nEnd * directionvector.x;
        obj.yEnd = y2 - nEnd * directionvector.y;
        obj.xDiff = x2 - x1;
        obj.yDiff = y2 - y1;
        obj.xMid = (x1 + x2) / 2;
        obj.yMid = (y1 + y2) / 2;
        obj.distance = Math.sqrt(obj.xDiff * obj.xDiff + obj.yDiff * obj.yDiff);
        /**3: Calc the CurvedPoint**/
        //BETTER ONLY CALC WHEN obj.approachTransition = true;
        var vecA = {
            x: obj.xMid - obj.xStart,
            y: obj.yMid - obj.yStart,
            z: 0
        };

        var vecB = {
            x: 0,
            y: 0,
            z: 1
        };


        var vecX = {
            x: 1,
            y: 0,
            z: 0
        };



        var stretchValue, movingPoint;
        //OLD:stretchValue = (70 * (1 / obj.distance * 1.1) * 1.4);
        stretchValue = 20;

        movingPoint = crossPro(vecA, vecB);
        movingPoint = fixVectorLength(movingPoint);

        movingPoint = expandVector(movingPoint, stretchValue);

        /**4:Calc the curvestart and end if there is and approach transition**/
        if (obj.approachTransition) {

            var xStart = getAngles({
                x: obj.xStart - x1,
                y: obj.yStart - y1
            }, {
                x: self.settings.stateRadius,
                y: 0
            });

            var xEnd = getAngles({
                x: obj.xEnd - x2,
                y: obj.yEnd - y2
            }, {
                x: self.settings.stateRadius,
                y: 0
            });

            obj.xStart = x1 + (self.settings.stateRadius * Math.cos(toRadians(xStart.upperAngle)));
            obj.yStart = y1 - (self.settings.stateRadius * Math.sin(toRadians(xStart.upperAngle)));

            obj.xEnd = x2 + (self.settings.stateRadius * Math.cos(toRadians(xEnd.lowerAngle)));
            obj.yEnd = y2 - (self.settings.stateRadius * Math.sin(toRadians(xEnd.lowerAngle)));
        }

        //OLD:stretchValue = (70 * (1 / obj.distance * 1.1) * 1.4);
        stretchValue = 35;

        movingPoint = crossPro(vecA, vecB);
        movingPoint = fixVectorLength(movingPoint);
        movingPoint = expandVector(movingPoint, stretchValue);
        obj.xMidCurv = movingPoint.x + obj.xMid;
        obj.yMidCurv = movingPoint.y + obj.yMid;


        /**5:Calc the textposition**/
        var existsDrawnTrans = self.existsDrawnTransition(fromState.id, toState.id);
        var drawnTrans = self.getDrawnTransition(fromState.id, toState.id);
        var transNamesLength;
        if (drawnTrans) {
            transNamesLength = drawnTrans.names.length;
        } else {
            transNamesLength = 1;
        }
        var angleAAndX = AngleBetweenTwoVectors(vecA, vecX);

        var textStretchValue, textPoint;
        var textAngle = angleAAndX.degree;
        if (textAngle > 90) {
            textAngle = 90 - (textAngle % 90);
        }
        var x = Math.pow((textAngle / 90), 1 / 2);

        if (obj.approachTransition) {
            textStretchValue = (40 + (8 * transNamesLength) * x);
        } else {
            textStretchValue = (12 + (transNamesLength * 8) * x);
        }


        textPoint = crossPro(vecA, vecB);
        textPoint = fixVectorLength(textPoint);
        textPoint = expandVector(textPoint, textStretchValue);

        obj.xText = textPoint.x + obj.xMid;
        obj.yText = textPoint.y + obj.yMid;


        /**6:Calc the path**/
        var array = [];
        if (obj.approachTransition) {
            array = [
                [obj.xStart, obj.yStart],
                [obj.xMidCurv, obj.yMidCurv],
                [obj.xEnd, obj.yEnd]
            ];
        } else {
            array = [
                [obj.xStart, obj.yStart],
                [obj.xEnd, obj.yEnd]
            ];
        }
        obj.path = self.bezierLine(array);
        return obj;
    };

    /**
     * Adds the transition names to the text of a transition
     * @param {object} textObj the transition textObjReference
     * @param {array}  names   the names array of the transition
     */
    self.writeTransitionText = function (textObj, names) {
        textObj.selectAll("*").remove();
        for (var i = 0; i < names.length; i++) {
            //fix when creating new transition when in animation
            if ($scope.simulator.animated.transition !== null && names[i].id === $scope.simulator.animated.transition.id) {
                textObj.append('tspan').attr('transition-id', names[i].id).text(names[i].name).classed("animated-transition-text", true);
            } else {
                textObj.append('tspan').attr('transition-id', names[i].id).text(names[i].name);
            }

            if (i < names.length - 1)
                textObj.append('tspan').text(' | ');
        }


    };

    /**
     * Draw a Transition
     * @param  {number} id 
     * @return {object}  Retruns the reference of the group object
     */
    self.drawTransition = function (transitionId) {
        var transition = $scope.getTransitionById(transitionId);
        //if there is not a transition with the same from and toState
        if (!self.existsDrawnTransition(transition.fromState, transition.toState)) {
            //the group element
            var group = self.svgTransitions.append("g")
                .attr("class", "transition"),
                //the line itself with the arrow
                lineSelection = group.append("path")
                .attr("class", "transition-line-selection")
                .attr("fill", "none")
                .attr("marker-end", "url(#marker-end-arrow-selection)"),
                line = group.append("path")
                .attr("class", "transition-line")
                .attr("fill", "none")
                .attr("marker-end", "url(#marker-end-arrow)"),

                lineClickArea = group.append("path")
                .attr("class", "transition-line-click")
                .attr("stroke-width", 20)
                .attr("stroke", "transparent")
                .attr("fill", "none"),
                lineHover = group.append("path")
                .attr("class", "transition-line-hover")
                .attr("fill", "none")
                .attr("marker-end", "url(#marker-end-arrow-hover)"),
                //the text of the transition
                text = group.append("text")
                .attr("class", "transition-text")
                .attr("dominant-baseline", "central")
                .attr("fill", "black");
            //if it is not a self Reference
            if (transition.fromState != transition.toState) {
                var drawConfig = self.getTransitionDrawConfig(transition);
                //if there is an approached transition update the approached transition
                if (drawConfig.approachTransition) {
                    //other transition in the other direction
                    var otherTrans = self.getDrawnTransition(transition.toState, transition.fromState);
                    var otherTransdrawConfig = self.getTransitionDrawConfig(otherTrans, true);
                    self.updateTransitionLines(otherTrans.objReference, otherTransdrawConfig.path);
                    //update the transition text position
                    otherTrans.objReference.select(".transition-text")
                        .attr("x", (otherTransdrawConfig.xText))
                        .attr("y", (otherTransdrawConfig.yText));
                }
                //draw the text
                text.attr("class", "transition-text")
                    .attr("x", (drawConfig.xText))
                    .attr("y", (drawConfig.yText));
                self.updateTransitionLines(group, drawConfig.path);

                //if it is a selfreference
            } else {
                var stateId = $scope.getArrayStateIdByStateId(transition.fromState);
                var x = $scope.config.states[stateId].x;
                var y = $scope.config.states[stateId].y;

                self.updateTransitionLines(group, self.selfTransition(x, y));
                text.attr("x", x - self.settings.stateRadius - 50)
                    .attr("y", y);
            }
            //add the drawnTransition
            group.attr("object-id", $scope.config.drawnTransitions.push({
                fromState: transition.fromState,
                toState: transition.toState,
                names: [{
                    "id": transition.id,
                    "name": transition.name
                }],
                objReference: group
            }) - 1);
            self.writeTransitionText(text, self.getDrawnTransition(transition.fromState, transition.toState).names);
            group.attr("from-state-id", transition.fromState)
                .attr("to-state-id", transition.toState)
                .on('click', self.openTransitionMenu)
                .on("mouseover", function () {
                    d3.select(this).select('.transition-line-hover').attr("style", "opacity:0.6");
                }).on("mouseleave", function () {
                    d3.select(this).select('.transition-line-hover').attr("style", "");
                });
            return group;
            //if there is already a transition with the same fromState and toState then the current
        } else {
            //add the name to the drawnTransition
            var drawnTransition = self.getDrawnTransition(transition.fromState, transition.toState);
            drawnTransition.names.push({
                "id": transition.id,
                "name": transition.name
            });
            //drawn the new name to the old transition (svg)
            self.writeTransitionText(drawnTransition.objReference.select('.transition-text'), self.getDrawnTransition(transition.fromState, transition.toState).names);
            var drawConfigNew = self.getTransitionDrawConfig(transition);
            drawnTransition.objReference.select('.transition-text')
                .attr("x", (drawConfigNew.xText))
                .attr("y", (drawConfigNew.yText));

        }
    };

    /**
     * helper function updates all the transition lines
     * @param {object}   transitionobjReference
     * @param {string}   path                   
     */
    self.updateTransitionLines = function (transitionobjReference, path) {
        transitionobjReference.select(".transition-line").attr("d", path);
        transitionobjReference.select(".transition-line-selection").attr("d", path);
        transitionobjReference.select(".transition-line-hover").attr("d", path);
        transitionobjReference.select(".transition-line-click").attr("d", path);
    };

    /**
     * opens the transitionmenu
     * @param {number} transitionId when there is a transitionId we open the transitionmenu with the given id
     */
    self.openTransitionMenu = function (transitionId) {
        self.closeStateMenu();
        self.closeTransitionMenu();
        self.preventSvgOuterClick = true;
        self.showTransitionMenu = true;

        var fromState, toState;
        if (transitionId === undefined) {
            fromState = d3.select(this).attr('from-state-id');
            toState = d3.select(this).attr('to-state-id');
            self.selectedTransition = self.getDrawnTransition(fromState, toState);
        } else {
            var tmpTransition = $scope.getTransitionById(transitionId);
            fromState = tmpTransition.fromState;
            toState = tmpTransition.toState;
            self.selectedTransition = self.getDrawnTransition(fromState, toState);
        }

        self.selectedTransition.objReference.classed("active", true);

        self.input = {};
        self.input.fromState = $scope.getStateById(fromState);
        self.input.toState = $scope.getStateById(toState);
        self.input.transitions = [];


        _.forEach(self.selectedTransition.names, function (value, key) {
            var tmpObject = {};
            tmpObject = cloneObject(value);

            if (transitionId !== undefined) {
                if (value.id == transitionId) {
                    tmpObject.isFocus = true;
                }
            } else if (self.selectedTransition.names.length - 1 === key) {
                tmpObject.isFocus = true;

            }
            //add other variables
            tmpObject.ttt = "";
            tmpObject.tttisopen = false;
            self.input.transitions.push(tmpObject);
        });

        self.transitionMenuListener = [];

        /*jshint -W083 */
        for (var i = 0; i < self.input.transitions.length; i++) {
            self.transitionMenuListener.push($scope.$watchCollection("statediagram.input.transitions['" + i + "']", function (newValue, oldValue) {
                if (newValue.name !== oldValue.name) {
                    newValue.tttisopen = false;
                    if (newValue.name !== "" && !$scope.existsTransition(fromState, toState, newValue.name)) {
                        $scope.renameTransition(newValue.id, newValue.name);
                    } else if (newValue.name === "") {
                        newValue.tttisopen = true;
                        newValue.ttt = 'TRANS_MENU.NAME_TOO_SHORT';
                    } else if ($scope.existsTransition(fromState, toState, newValue.name, newValue.id)) {
                        newValue.tttisopen = true;
                        newValue.ttt = 'TRANS_MENU.NAME_ALREAD_EXISTS';
                    }
                    console.log(($scope.existsTransition(fromState, toState, newValue.name, newValue.id)));
                }
            }));
        }


        $scope.safeApply();

    };

    /**
     * closes the transitionmenu
     */
    self.closeTransitionMenu = function () {
        _.forEach(self.transitionMenuListener, function (value, key) {
            value();
        });
        self.showTransitionMenu = false;
        if (self.selectedTransition !== null) {
            self.selectedTransition.objReference.classed("active", false);
            self.selectedTransition = null;

        }
    };

    /**
     * Update the transitions in the svg after moving a state
     * @param  {number} stateId Moved stateId
     */
    self.updateTransitionsAfterStateDrag = function (stateId) {
        var stateName = $scope.config.states[$scope.getArrayStateIdByStateId(stateId)].name;
        _.forEach($scope.config.drawnTransitions, function (n, key) {
            if (n.fromState == stateId || n.toState == stateId) {
                //if its not a selfreference
                var obj = n.objReference,
                    transitionText = obj.select("text");
                if (n.fromState != n.toState) {
                    var drawConfig = self.getTransitionDrawConfig(n);
                    //if there is a transition in the other direction
                    self.updateTransitionLines(obj, drawConfig.path);
                    transitionText.attr("x", drawConfig.xText).attr("y", drawConfig.yText);
                } else {
                    var moveStateId = n.fromState;
                    var x = $scope.config.states[$scope.getArrayStateIdByStateId(moveStateId)].x;
                    var y = $scope.config.states[$scope.getArrayStateIdByStateId(moveStateId)].y;
                    //update Transistion with self reference
                    self.updateTransitionLines(obj, self.selfTransition(x, y));
                    transitionText.attr("x", x - self.settings.stateRadius - 50).attr("y", y);
                }
            }
        });
    };

    /**************
     **SIMULATION**
     *************/


    $scope.$watch('simulator.animated.currentState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            console.log("CURRENTSTATE:oldValue " + oldValue + " newvalue " + newValue);
            console.log("status" + $scope.simulator.status);
            if (oldValue !== null) {
                self.setStateClassAs(oldValue, false, "animated-currentstate-svg");
                self.setStateClassAs(oldValue, false, "animated-accepted-svg");
                self.setStateClassAs(oldValue, false, "animated-not-accepted-svg");

            }
            if (newValue !== null) {
                if ($scope.simulator.status === "accepted") {
                    self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-accepted-svg");
                } else if ($scope.simulator.status === "not accepted") {
                    self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-not-accepted-svg");
                } else {
                    self.setStateClassAs(newValue, true, "animated-currentstate-svg");
                }
            }
        }
    });

    $scope.$watch('simulator.animated.transition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            if (oldValue !== null) {
                self.setTransitionClassAs(oldValue.id, false, "animated-transition");
                d3.selectAll("[transition-id='" + oldValue.id + "'").classed("animated-transition-text", false);
                //remove transitionname animation
            }
            if (newValue !== null) {
                self.setTransitionClassAs(newValue.id, true, "animated-transition");
                console.log(newValue);
                d3.selectAll("[transition-id='" + newValue.id + "'").classed("animated-transition-text", true);
                //animate transitionname
            }
        }
    });

    $scope.$watch('simulator.animated.nextState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            console.log("NEXTSTATE: oldValue " + oldValue + " newvalue " + newValue);
            if (oldValue !== null) {
                self.setStateClassAs(oldValue, false, "animated-nextstate-svg");
            }
            if (newValue !== null) {
                self.setStateClassAs(newValue, true, "animated-nextstate-svg");
            }
        }
    });
    $scope.$watch('simulator.status', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            if ($scope.simulator.status === "accepted") {
                self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-accepted-svg");
            } else if ($scope.simulator.status === "not accepted") {
                self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-not-accepted-svg");
            }
        }

    });
}
function StatetransitionfunctionDFA($scope) {
    "use strict";

    var self = this;
    self.functionData = {};
    self.functionData.states = [];
    self.functionData.startState = '';
    self.functionData.finalStates = '';
    self.functionData.transitions = '';
    self.functionData.statetransitionfunction = [];
    //ADD Listener
    $scope.updateListeners.push(self);


    self.updateFunction = function () {
        var arrayAlphabet = [];
        var stringAlphabet = '';
        var stringStates = '';
        var stringStateTransitions = '';
        var stringAllStateTransitions = '';
        var stringStartState = '';
        var startState;
        var stringFinalStates = '';
        var finalState;
        var i;

        self.functionData.transitions = $scope.config.alphabet;



        //Update of States
        self.functionData.states = [];
        _.forEach($scope.config.states, function (state, key) {
            stringStates = '';
            var selectedClass = '';
            if ($scope.statediagram.selectedState !== null && $scope.statediagram.selectedState.id == state.id) {
                selectedClass = "selected";
            }
            if (state.id == $scope.simulator.animated.currentState && $scope.simulator.status === "accepted") {
                stringStates += '<span class="animated-accepted ' + selectedClass + '">';
            } else if (state.id == $scope.simulator.animated.currentState && $scope.simulator.status === "not accepted") {
                stringStates += '<span class="animated-not-accepted ' + selectedClass + '">';
            } else if (state.id == $scope.simulator.animated.currentState) {
                stringStates += '<span class="animated-currentstate ' + selectedClass + '">';
            } else {
                stringStates += '<span class="' + selectedClass + '">';
            }

            stringStates += state.name;
            stringStates += '</span>';
            if (key < $scope.config.states.length - 1) {
                stringStates = stringStates + ', ';
            }
            self.functionData.states.push(stringStates);
        });



        //Update of statetransitionfunction
        self.functionData.statetransitionfunction = [];
        //we go through every state and check if there is a transition and then we save them in the statetransitionfunction array
        _.forEach($scope.config.states, function (state, keyOuter) {
            _.forEach($scope.config.transitions, function (transition, key) {

                if (transition.fromState === state.id) {
                    var stateTransition = transition;
                    var selectedTransition = false;
                    if ($scope.statediagram.selectedTransition !== null && _.find($scope.statediagram.selectedTransition.names, {
                            id: transition.id
                        }) !== undefined) {
                        selectedTransition = true;
                    }
                    var animatedCurrentState = false;
                    if ($scope.simulator.animated.transition && $scope.simulator.animated.transition.id === stateTransition.id) {
                        animatedCurrentState = true;
                    }
                    if (animatedCurrentState || selectedTransition) {
                        stringStateTransitions = '(<span class=" ' + (animatedCurrentState ? 'animated-transition' : '') + ' ' + (selectedTransition ? 'selected' : '') + '">';
                    } else {
                        stringStateTransitions = '(<span>';
                    }
                    stringStateTransitions += $scope.getStateById(stateTransition.fromState).name + ', ';
                    stringStateTransitions += stateTransition.name + ', ';
                    stringStateTransitions += $scope.getStateById(stateTransition.toState).name + '</span>)';

                    self.functionData.statetransitionfunction.push(stringStateTransitions);
                }
            });
        });


        //Update of Startstate
        startState = $scope.getStateById($scope.config.startState);
        if (startState !== undefined) {
            stringStartState += '<span class="">' + startState.name + '</span>';
        }

        self.functionData.startState = stringStartState;

        //Update of Finalstates
        _.forEach($scope.config.finalStates, function (finalState, key) {
            finalState = $scope.getStateById(finalState);
            stringFinalStates = finalState.name;
            if (key < $scope.config.finalStates.length - 1) {
                stringFinalStates += ', ';
            }
        });

        self.functionData.finalStates = stringFinalStates;

    };


    /**************
     **SIMULATION**
     *************/

    $scope.$watch('simulator.animated.currentState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('simulator.animated.transition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedTransition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });
    $scope.$watch('simulator.status', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });
}
//TableDFA
function TableDFA($scope) {
    var self = this;
    self.states = [];
    $scope.updateListeners.push(self);


    self.updateFunction = function () {
        self.states = [];
        self.alphabet = [];
        var dfa = $scope.config;



        var alphabetCounter;

        //prepare alphabet
        _.forEach($scope.config.alphabet, function (character, key) {
            var selectedTrans = "";
            if ($scope.statediagram.selectedTransition !== null && _.find($scope.statediagram.selectedTransition.names, {
                    name: character
                }) !== undefined) {
                selectedTrans = "selected";
            }

            var tmp;
            if ($scope.simulator.animated.transition && $scope.simulator.animated.transition.name === character) {
                tmp = '<span class="animated-transition ' + selectedTrans + '">' + character + '</span>';
            } else {
                tmp = '<span class="' + selectedTrans + '">' + character + '</span>';
            }
            self.alphabet.push(tmp);
        });

        // iterates over all States
        _.forEach($scope.config.states, function (state, key) {


            var tmpObject = {};
            tmpObject.id = state.id;
            // marks the current active state at the simulation in the table
            var selectedClass = "";
            if (($scope.statediagram.selectedState !== null && $scope.statediagram.selectedState.id == state.id) || ($scope.statediagram.selectedTransition !== null && $scope.statediagram.selectedTransition.fromState === state.id)) {
                selectedClass = "selected";
            }
            if ($scope.simulator.animated.currentState == state.id) {
                var animatedClass = "";
                if ($scope.simulator.status === "accepted") {
                    animatedClass = "animated-accepted";
                } else if ($scope.simulator.status === "not accepted") {
                    animatedClass = "animated-not-accepted";
                } else {
                    animatedClass = "animated-currentstate";
                }

                tmpObject.name = '<span class="' + animatedClass + ' ' + selectedClass + '">' + state.name + '</span>';
            } else {
                tmpObject.name = '<span class="' + selectedClass + '">' + state.name + '</span>';
            }

            if ($scope.isStateAFinalState(state.id))
                tmpObject.finalState = true;
            else
                tmpObject.finalState = false;

            if ($scope.config.startState === state.id)
                tmpObject.startState = true;
            else
                tmpObject.startState = false;

            tmpObject.trans = [];


            // iterates over all aplphabet 
            _.forEach($scope.config.alphabet, function (character, key) {
                var foundTransition = null;

                // iterates over the available transitions and saves found transitions
                _.forEach($scope.config.transitions, function (transition, key) {
                    if (transition.fromState === state.id && transition.name === character) {
                        foundTransition = transition;
                    }
                });

                var trans = {};
                trans.alphabet = character;

                // saves the found Transition in "Trans.State"
                if (foundTransition !== null) {
                    var tmpToState = $scope.getStateById(foundTransition.toState);
                    var selectedTrans = "";
                    if ($scope.statediagram.selectedTransition !== null && $scope.statediagram.selectedTransition.toState === tmpToState.id) {
                        selectedTrans = "selected";
                    }
                    if ($scope.simulator.animated.nextState == tmpToState.id && foundTransition.name == $scope.simulator.animated.transition.name) {
                        trans.State = '<span class="animated-nextstate ' + selectedTrans + '">' + tmpToState.name + '</span>';
                    } else {
                        trans.State = '<span class="' + selectedTrans + '">' + tmpToState.name + '</span>';
                    }
                } else {
                    trans.State = "";
                }

                tmpObject.trans.push(trans);
            });
            self.states.push(tmpObject);

        });

    };


    /**************
     **SIMULATION**
     *************/

    $scope.$watch('simulator.animated.currentState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('simulator.animated.transition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });
    $scope.$watch('simulator.animated.nextState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedTransition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

}
function DFA(t,e){"use strict";window.debugScope=t,t.defaultConfig={},t.defaultConfig.statePrefix="S",t.defaultConfig.transitionNameSuffix="|",t.defaultConfig.diagramm={x:0,y:0,scale:1,updatedWithZoomBehavior:!1},t.defaultConfig.countStateId=0,t.defaultConfig.countTransitionId=0,t.defaultConfig.states=[],t.defaultConfig.startState=null,t.defaultConfig.finalStates=[],t.defaultConfig.transitions=[],t.defaultConfig.alphabet=[],t.defaultConfig.inputWord="",t.defaultConfig.name="Untitled Automaton",t.defaultConfig.unSavedChanges=!1,t.defaultConfig.drawnTransitions=[],t.config=cloneObject(t.defaultConfig),t.updateListeners=[],t.simulator=new SimulationDFA(t),t.table=new TableDFA(t),t.statediagram=new StateDiagramDFA(t,"#diagramm-svg"),t.statetransitionfunction=new StatetransitionfunctionDFA(t),t.testData=new TestData(t),t.inNameEdit=!1,t.showModalWithMessage=function(e,a,n,i){t.title=e,t.description=a,t.modalAction=n,void 0===i?t.button="MODAL_BUTTON.PROCEED":t.button=i,$("#modal").modal()},t.executeModalAction=function(){t.$eval(t.modalAction)},t.stepTimeOutSlider={options:{floor:0,step:100,ceil:3e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.loopTimeOutSlider={options:{floor:0,step:100,ceil:4e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.keypressCallback=function(t){13==t.charCode&&document.getElementById("automatonNameEdit").blur()},window.onbeforeunload=function(e){if(t.config.unSavedChanges){var a="All Changes will be Lost. Save before continue!";return"undefined"==typeof e&&(e=window.event),e&&(e.returnValue=a),a}},t.saveAutomaton=function(){t.config.unSavedChanges=!1},t.safeApply=function(t){var e=this.$root.$$phase;"$apply"==e||"$digest"==e?t&&"function"==typeof t&&t():this.$apply(t)},t.resetAutomaton=function(){t.statediagram.clearSvgContent(),t.simulator.reset(),t.config=cloneObject(t.defaultConfig),t.safeApply(),t.updateListener()},t.addToAlphabet=function(e){_.some(t.config.alphabet,function(t){return t===e})||t.config.alphabet.push(e)},t.removeFromAlphabetIfNotUsedFromOthers=function(e){for(var a=t.getTransitionById(e),n=!1,i=0;i<t.config.transitions.length;i++)if(a.name===t.config.transitions[i].name&&t.config.transitions[i].id!==e)return void(n=!0);return n?!1:(_.pull(t.config.alphabet,a.name),!0)},t.updateListener=function(){_.forEach(t.updateListeners,function(t,e){t.updateFunction()}),t.config.unSavedChanges=!0},t.existsStateWithName=function(e,a){var n=!1;return _.forEach(t.config.states,function(t){return t.name==e&&t.id!==a?void(n=!0):void 0}),n},t.existsStateWithId=function(e){for(var a=0;a<t.config.states.length;a++)if(t.config.states[a].id==e)return!0;return!1},t.hasStateTransitions=function(e){var a=!1;return _.forEach(t.config.transitions,function(t){t.fromState!=e&&t.toState!=e||(a=!0)}),a},t.getArrayStateIdByStateId=function(e){return _.findIndex(t.config.states,function(t){return t.id==e?t:void 0})},t.getStateById=function(e){return t.config.states[t.getArrayStateIdByStateId(e)]},t.getStateByName=function(e){return t.config.states[t.getArrayStateIdByStateId(function(t){})]},t.addStateWithPresets=function(e,a){var n=t.addState(t.config.statePrefix+t.config.countStateId,e,a);return 1==t.config.countStateId&&t.changeStartState(0),n},t.addState=function(e,a,n){return t.existsStateWithName(e)?null:t.addStateWithId(t.config.countStateId++,e,a,n)},t.addStateWithId=function(e,a,n,i){t.config.states.push(new State(e,a,n,i));return t.statediagram.drawState(e),t.updateListener(),t.safeApply(),t.getStateById(e)},t.removeState=function(e){t.hasStateTransitions(e)?t.showModalWithMessage("STATE_MENU.DELETE_MODAL_TITLE","STATE_MENU.DELETE_MODAL_DESC","forcedRemoveState("+e+")","MODAL_BUTTON.DELETE"):(t.isStateAFinalState(e)&&t.removeFinalState(e),t.config.startState==e&&(t.config.startState=null),t.statediagram.removeState(e),t.config.states.splice(t.getArrayStateIdByStateId(e),1),t.updateListener())},t.forcedRemoveState=function(e){for(var a=0;a<t.config.transitions.length;a++){var n=t.config.transitions[a];n.fromState!==e&&n.toState!==e||(t.removeTransition(n.id),a--)}t.removeState(e)},t.renameState=function(e,a){return t.existsStateWithName(a)?!1:(t.getStateById(e).name=a,t.statediagram.renameState(e,a),t.updateListener(),!0)},t.changeStartState=function(e){t.existsStateWithId(e)&&(t.statediagram.changeStartState(e),t.config.startState=e,t.updateListener())},t.removeStartState=function(){null!==t.config.startState&&(t.statediagram.removeStartState(),t.updateListener(),t.config.startState=null)},t.getFinalStateIndexByStateId=function(e){return _.indexOf(t.config.finalStates,e)},t.isStateAFinalState=function(e){for(var a=0;a<t.config.finalStates.length;a++)if(t.config.finalStates[a]==e)return!0;return!1},t.addFinalState=function(e){t.isStateAFinalState(e)||(t.config.finalStates.push(e),t.statediagram.addFinalState(e),t.updateListener())},t.removeFinalState=function(e){t.isStateAFinalState(e)&&(t.statediagram.removeFinalState(e),t.updateListener(),t.config.finalStates.splice(t.getFinalStateIndexByStateId(e),1))},t.existsTransition=function(e,a,n,i){for(var r=!1,s=0;s<t.config.transitions.length;s++){var o=t.config.transitions[s];o.fromState==e&&o.name==n&&o.id!==i&&(r=!0)}return r},t.getNextTransitionName=function(e){for(var a=[],n=0;n<t.config.transitions.length;n++)t.config.transitions[n].fromState==e&&a.push(t.config.transitions[n].name);for(var i=!1,r="a";!i;){var s=_.indexOf(a,r);-1===s?i=!0:r=String.fromCharCode(r.charCodeAt()+1)}return r},t.addTransition=function(e,a,n){return!t.existsTransition(e,a,n)&&t.existsStateWithId(e)&&t.existsStateWithId(a)?(t.addToAlphabet(n),t.addTransitionWithId(t.config.countTransitionId++,e,a,n)):void 0},t.addTransitionWithId=function(e,a,n,i){return t.config.transitions.push(new TransitionDFA(e,a,n,i)),t.statediagram.drawTransition(e),t.updateListener(),t.safeApply(),t.getTransitionById(e)},t.getArrayTransitionIdByTransitionId=function(e){return _.findIndex(t.config.transitions,function(t){return t.id==e?t:void 0})},t.getTransitionById=function(e){return t.config.transitions[t.getArrayTransitionIdByTransitionId(e)]},t.getTransition=function(e,a,n){for(var i=0;i<t.config.transitions.length;i++){var r=t.config.transitions[i];if(r.fromState==e&&r.toState==a&&r.name==n)return r}},t.removeTransition=function(e){t.removeFromAlphabetIfNotUsedFromOthers(e),t.statediagram.removeTransition(e),t.config.transitions.splice(t.getArrayTransitionIdByTransitionId(e),1),t.updateListener()},t.renameTransition=function(e,a){var n=t.getTransitionById(e);if(t.existsTransition(n.fromState,n.toState,a))return!1;t.getTransitionById(e);return t.removeFromAlphabetIfNotUsedFromOthers(e),t.addToAlphabet(a),t.getTransitionById(e).name=a,t.statediagram.renameTransition(n.fromState,n.toState,e,a),t.updateListener(),!0}}function SimulationDFA(t){"use strict";var e=this;e.isInPlay=!1,e.loopSimulation=!0,e.stepTimeOut=1500,e.loopTimeOut=2e3,e.simulationPaused=!1,e.simulationSettings=!0,e.currentState=null,e.nextState=null,e.transition=null,e.isInputAccepted=!1,e.settings=function(){e.simulationSettings=!e.simulationSettings},e.animated={currentState:null,transition:null,nextState:null},e.reset=function(){e.animated={currentState:null,transition:null,nextState:null},e.goneTransitions=[],e.currentState=t.config.startState,e.transition=null,e.animatedTransition=!1,e.nextState=null,e.animatedNextState=!1,e.isNextStepCalculated=!1,e.simulationStarted=!1,e.statusSequence=[t.config.startState],e.madeSteps=0,e.inputWord=t.config.inputWord,e.processedWord="",e.nextChar="",e.status="stopped"},e.pause=function(){e.simulationPaused||(e.simulationPaused=!0,e.isInPlay=!1)},e.stop=function(){e.pause(),e.reset()},e.play=function(){e.simulationPaused||(e.simulationStarted?((e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&(e.animateNextMove(),t.safeApply(function(){}),(e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&setTimeout(e.play,e.stepTimeOut)),e.isNextStepCalculated||"accepted"!=e.status||(e.loopSimulation?setTimeout(e.play,e.loopTimeOut):e.isInPlay=!1,e.simulationStarted=!1,t.safeApply(function(){}))):e.prepareSimulation())},e.prepareSimulation=function(){e.reset(),e.simulationStarted=!0,e.animated.currentState=_.last(e.statusSequence),t.safeApply(),setTimeout(e.play,e.loopTimeOut)},e.animateNextMove=function(){e.isNextStepCalculated||e.calcNextStep(),e.animatedTransition?!e.animatedNextState&&e.animatedTransition?(e.animatedNextState=!0,e.animated.nextState=e.nextState):e.animatedTransition&&e.animatedNextState&&(e.animated.transition=null,e.animated.nextState=null,e.animated.currentState=e.nextState,e.currentState=e.nextState,e.madeSteps++,e.inputWord.length==e.madeSteps&&(_.include(t.config.finalStates,e.currentState)?e.status="accepted":e.status="not accepted"),e.isNextStepCalculated=!1,e.animatedNextState=!1,e.animatedTransition=!1,e.processedWord+=e.nextChar,e.statusSequence.push(e.currentState),"accepted"!==e.status&&"not accepted"!==e.status&&e.calcNextStep()):(e.animatedTransition=!0,e.animated.transition=e.transition,e.goneTransitions.push(e.transition))},e.calcNextStep=function(){return e.isNextStepCalculated=!0,e.status="step",e.nextChar=e.inputWord[e.madeSteps],e.transition=_.filter(t.config.transitions,function(t){return void 0===e.nextChar?void(e.status="not accepted"):t.fromState==_.last(e.statusSequence)&&t.name==e.nextChar}),_.isEmpty(e.transition)?(e.transition=null,void(e.status="not accepted")):(e.transition=e.transition[0],void(e.nextState=e.transition.toState))},e.stepForward=function(){if(e.simulationPaused||e.pause(),e.simulationStarted){if(!_.include(["step","stopped","accepted","not accepted"],e.status))return void console.log(e.status);_.include(["accepted","not accepted"],e.status)||e.animateNextMove()}else e.prepareSimulation(),e.status="step"},e.stepBackward=function(){e.simulationPaused||e.pause(),_.include(["step","accepted","not accepted"],e.status)&&(e.status="step",e.animatedTransition||e.animatedNextState||0!==e.madeSteps?e.animateLastMove():e.reset())},e.animateLastMove=function(){console.log(e.animatedTransition+" "+e.animatedNextState),e.animatedTransition&&e.animatedNextState?(e.animated.nextState=null,e.animatedNextState=!1):e.animatedTransition?(e.animated.transition=null,e.animatedTransition=!1,e.goneTransitions.pop()):e.calcLastStep()},e.calcLastStep=function(){e.nextChar=e.processedWord.slice(-1),console.log(e.nextChar+" "+e.statusSequence[e.statusSequence.length-2]),e.transition=_.last(e.goneTransitions),console.log(e.transition),_.pullAt(e.goneTransitions,e.goneTransitions.length),e.animatedTransition=!0,e.animated.transition=e.transition;var t=e.currentState;e.currentState=e.transition.fromState,e.nextState=t,e.animated.nextState=e.nextState,e.animatedNextState=!0,e.animated.currentState=e.currentState,e.madeSteps--,e.statusSequence.splice(-1,1),e.processedWord=e.processedWord.slice(0,-1)},e.getNextTransition=function(e,a){for(var n=0;n<t.config.transitions.length;n++){var i=t.config.transitions[n];if(i.fromState==e&&i.name==a)return i}},e.check=function(){var a=!1,n=[];n.push(t.config.startState);for(var i="",r=0,s=null;r<=t.config.inputWord.length&&(i=t.config.inputWord[r],s=e.getNextTransition(_.last(n),i),!_.isEmpty(s));)if(n.push(s.toState),r++,t.config.inputWord.length==r){if(_.include(t.config.finalStates,_.last(n))){a=!0;break}break}return a},e.isPlayable=function(){return t.config.states.length>=1&&t.config.transitions.length>=1&&null!==t.config.startState&&t.config.finalStates.length>=1},e.playOrPause=function(){e.isPlayable()&&(e.isInPlay=!e.isInPlay,e.isInPlay?(e.simulationPaused=!1,e.play()):e.pause())},t.updateListeners.push(e),e.updateFunction=function(){e.isInputAccepted=e.check()}}function StateDiagramDFA(t,e){"use strict";function a(t,e){var a={x:t.y*e.z,y:-t.x*e.z};return a}function n(t){return t*(180/Math.PI)}function i(t){return t*(Math.PI/180)}function r(t,e){return{x:t.x*e,y:t.y*e}}function s(t){var e=1/Math.sqrt(t.x*t.x+t.y*t.y);return{x:t.x*e,y:t.y*e}}function o(t,e){var a=(t.x*e.x+t.y*e.y)/(Math.sqrt(t.x*t.x+t.y*t.y)*Math.sqrt(e.x*e.x+e.y*e.y)),i=Math.acos(a);return{val:a,rad:i,degree:n(i)}}function c(t,e){var a=t.x*e.x+t.y*e.y,n=t.x*e.y-t.y*e.x;return Math.atan2(n,a)}function d(t,e){var a=n(c(t,e));0>a&&(a+=360);var i=a+g;i>360&&(i-=360);var r=a-g;return 0>r&&(r+=360),{angle:a,lowerAngle:r,upperAngle:i}}var l=this;l.preventStateDragging=!1,l.inAddTransition=!1,l.selectedState=null,l.preventSvgOuterClick=!1,l.selectedTransition=null,l.showStateMenu=!1,l.showTransitionMenu=!1,l.selectedStateName="selectedForTransition",l.snapping=!0,l.settings={stateRadius:25,finalStateRadius:29,selected:!1};var u=40,f=18;l.stateSelfReferenceNumber=Math.sin(45*(Math.PI/180))*l.settings.stateRadius,l.existsDrawnTransition=function(e,a){for(var n=!1,i=0;i<t.config.drawnTransitions.length;i++){var r=t.config.drawnTransitions[i];r.fromState==e&&r.toState==a&&(n=!0)}return n},l.getDrawnTransition=function(e,a){for(var n=0;n<t.config.drawnTransitions.length;n++){var i=t.config.drawnTransitions[n];if(i.fromState==e&&i.toState==a)return i}},l.clearSvgContent=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgTransitions.html(""),l.svgStates.html(""),t.config.drawnTransitions=[],l.svg.attr("transform","translate("+t.defaultConfig.diagramm.x+","+t.defaultConfig.diagramm.y+") scale("+t.defaultConfig.diagramm.scale+")"),m.scale(t.defaultConfig.diagramm.scale),m.translate([t.defaultConfig.diagramm.x,t.defaultConfig.diagramm.y])},l.zoomMax=2.5,l.zoomMin=.5,l.zoomValue=.1,l.zoomIn=function(){t.config.diagramm.scale=t.config.diagramm.scale+l.zoomValue>l.zoomMax?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale+l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomOut=function(){t.config.diagramm.scale=t.config.diagramm.scale-l.zoomValue<=l.zoomMin?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale-l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomTo=function(e){console.log("zoomtedto"),t.config.diagramm.scale=e/100,t.safeApply(),l.updateZoomBehaviour()},l.updateZoomBehaviour=function(){t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")"),m.scale(t.config.diagramm.scale),m.translate([t.config.diagramm.x,t.config.diagramm.y])},l.zoomFitWindow=function(){var e,a=[],n=[],i=0,r=0,s=0,o=0,c=0,d=0,u=l.svgOuter.style("width").replace("px",""),f=l.svgOuter.style("height").replace("px","");if(t.config.diagramm.scale=1,t.config.states.length>0){for(e=0;e<t.config.states.length;e++)a[e]=t.config.states[e].x;for(e=0;e<t.config.states.length;e++)n[e]=t.config.states[e].y;for(i=_.min(a),r=_.max(a),s=_.min(n),o=_.max(n);r-i+150>u/t.config.diagramm.scale||o-s+200>f/t.config.diagramm.scale;)t.config.diagramm.scale-=.01;t.safeApply(),c=(f/t.config.diagramm.scale-(o-s))/2,d=(u/t.config.diagramm.scale-(r-i))/2,t.config.diagramm.x=-(i*t.config.diagramm.scale)+d*t.config.diagramm.scale,t.config.diagramm.y=-(s*t.config.diagramm.scale)+c*t.config.diagramm.scale,l.updateZoomBehaviour()}else l.scaleAndTranslateToDefault()},l.scaleAndTranslateToDefault=function(){t.config.diagramm.scale=t.defaultConfig.diagramm.scale,t.config.diagramm.x=t.defaultConfig.diagramm.x,t.config.diagramm.y=t.defaultConfig.diagramm.y,t.safeApply(),l.updateZoomBehaviour()};var m=d3.behavior.zoom().scaleExtent([l.zoomMin,l.zoomMax]).on("zoom",function(){var e=d3.event.button||d3.event.ctrlKey;if(e&&d3.event.stopImmediatePropagation(),3!==d3.event.sourceEvent.which){var a=Math.floor(100*d3.event.scale)/100;t.config.diagramm.scale=a,t.config.diagramm.x=d3.event.translate[0],t.config.diagramm.y=d3.event.translate[1],t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")")}else console.log("rightclick!")});l.svgOuter=d3.select(e).call(m).on("dblclick.zoom",null).on("contextmenu",function(){d3.event.preventDefault()}),l.addSvgOuterClickListener=function(){l.svgOuter.on("click",function(){l.preventSvgOuterClick?l.preventSvgOuterClick=!1:(l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply())})},l.addSvgOuterClickListener(),l.svgGrid=l.svgOuter.append("g").attr("id","grid"),l.svg=l.svgOuter.append("g").attr("id","svg-items"),l.svgTransitions=l.svg.append("g").attr("id","transitions"),l.svgStates=l.svg.append("g").attr("id","states"),l.gridSpace=100,l.gridSnapDistance=20,l.isGrid=!0,t.$watch("[statediagram.isGrid , config.diagramm]",function(){l.drawGrid()},!0),l.drawGrid=function(){if(l.isGrid){l.svgGrid.html("");var e,a=l.svgOuter.style("width").replace("px",""),n=l.svgOuter.style("height").replace("px",""),i=1*t.config.diagramm.scale*.5,r=t.config.diagramm.x%(l.gridSpace*t.config.diagramm.scale),s=t.config.diagramm.y%(l.gridSpace*t.config.diagramm.scale);for(e=r;a>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line xgrid-line").attr("x1",e).attr("y1",0).attr("x2",e).attr("y2",n);for(e=s;n>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line ygrid-line").attr("x1",0).attr("y1",e).attr("x2",a).attr("y2",e)}else l.svgGrid.html("")},l.defs=l.svg.append("svg:defs"),l.defs.append("svg:marker").attr("id","marker-end-arrow").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-create").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-animated").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-hover").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-selection").attr("refX",4).attr("refY",3).attr("markerWidth",5).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.resetAddActions=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgOuter.on("click",null),l.inAddTransition=!1,l.inAddState=!1},l.addState=function(){l.resetAddActions(),l.svgOuter.on("mousemove",function(){l.selectedState.objReference.attr("transform","translate("+(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale)+" "+(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale)+")")}),l.selectedState=t.addStateWithPresets(-1e4,-1e4),l.selectedState.objReference.classed("state-in-creation",!0),l.svgOuter.on("click",function(){l.selectedState.objReference.classed("state-in-creation",!1),l.selectedState.x=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),l.selectedState.y=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),l.selectedState.objReference.attr("transform","translate("+l.selectedState.x+" "+l.selectedState.y+")"),l.svgOuter.on("mousemove",null),l.addSvgOuterClickListener(),l.preventSvgOuterClick=!1,t.safeApply()})},l.addTransition=function(){l.resetAddActions(),l.preventStateDragging=!0,d3.selectAll(".state").on("click",function(){if(l.mouseInState=!0,null===l.selectedState)l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.tmpTransition=l.svgTransitions.append("g").attr("class","transition"),l.tmpTransitionline=l.tmpTransition.append("path").attr("class","transition-line curvedLine in-creation").attr("marker-end","url(#marker-end-arrow-create)").attr("fill","none");else{var e=t.addTransition(l.selectedState.id,parseInt(d3.select(this).attr("object-id")),t.getNextTransitionName(l.selectedState.id));l.toggleState(l.selectedState.id,!1),l.tmpTransition.remove(),l.tmpTransition=null,l.tmpTransitionline=null,l.preventStateDragging=!1,l.addSvgOuterClickListener(),l.svgOuter.on("mousemove",null),d3.selectAll(".state").on("mouseover",null),d3.selectAll(".state").on("mouseleave",null),d3.selectAll(".state").on("click",l.openStateMenu),l.openTransitionMenu(e.id)}}),l.svgOuter.on("mousemove",function(){if(!l.mouseInState&&null!==l.selectedState){var e=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),a=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),n=l.bezierLine([[l.selectedState.x,l.selectedState.y],[e,a]]);l.tmpTransitionline.attr("d",n)}}),d3.selectAll(".state").on("mouseover",function(e){if(l.mouseInState=!0,null!==l.selectedState){var a=t.getStateById(d3.select(this).attr("object-id")),n={};n.fromState=l.selectedState.id,n.toState=a.id;var i=l.tmpTransitionline;if(l.existsDrawnTransition(l.selectedState.fromState,l.selectedState.toState)){var r=l.getDrawnTransition(n.fromState,n.toState);r.names.push(n.name),l.writeTransitionText(r.objReference.select(".transition-text"),r.names)}else if(n.fromState!=n.toState){var s=l.getTransitionDrawConfig(n);if(s.approachTransition){var o=l.getDrawnTransition(n.toState,n.fromState),c=l.getTransitionDrawConfig(o,!0);l.updateTransitionLines(o.objReference,c.path),o.objReference.select(".transition-text").attr("x",c.xText).attr("y",c.yText),l.otherTransition=o}i.attr("d",s.path)}else{var d=t.getArrayStateIdByStateId(n.fromState),u=t.config.states[d].x,f=t.config.states[d].y;i.attr("d",l.selfTransition(u,f))}l.tmpTransitionline.attr("x1",l.selectedState.x).attr("y1",l.selectedState.y).attr("x2",a.x).attr("y2",a.y)}}).on("mouseleave",function(){if(l.mouseInState=!1,null!==l.otherTransition&&void 0!==l.otherTransition){var t=l.getTransitionDrawConfig(l.otherTransition);l.updateTransitionLines(l.otherTransition.objReference,t.path),l.otherTransition.objReference.select(".transition-text").attr("x",t.xText).attr("y",t.yText)}})},l.renameState=function(e,a){var n=t.config.states[t.getArrayStateIdByStateId(e)],i=n.objReference;i.select("text").text(a)},l.removeState=function(e){l.closeStateMenu();var a=t.config.states[t.getArrayStateIdByStateId(e)],n=a.objReference;n.remove()},l.renameTransition=function(t,e,a,n){var i=l.getDrawnTransition(t,e),r=_.find(i.names,{id:a});r.name=n,l.writeTransitionText(i.objReference.select(".transition-text"),i.names)},l.removeTransition=function(e){var a=t.getTransitionById(e),n=l.getDrawnTransition(a.fromState,a.toState),i=l.getTransitionDrawConfig(a);if(l.closeTransitionMenu(),1===n.names.length){if(n.objReference.remove(),_.remove(t.config.drawnTransitions,function(t){return t==n}),i.approachTransition){var r=l.getDrawnTransition(a.toState,a.fromState),s=l.getTransitionDrawConfig(r,!1);l.updateTransitionLines(r.objReference,s.path),r.objReference.select(".transition-text").attr("x",s.xText).attr("y",s.yText),l.otherTransition=r}}else _.remove(n.names,function(t){return t.id==a.id}),l.writeTransitionText(n.objReference.select(".transition-text"),n.names),i=l.getTransitionDrawConfig(a),n.objReference.select(".transition-text").attr("x",i.xText).attr("y",i.yText),console.log(n),l.openTransitionMenu(n.names[n.names.length-1].id)},l.addFinalState=function(e){var a=t.getStateById(e);a.objReference.insert("circle",".state-circle").attr("class","final-state").attr("r",l.settings.finalStateRadius)},l.removeFinalState=function(e){var a=t.getStateById(e);a.objReference.select(".final-state").remove()},l.changeStartState=function(e){if(null!==t.config.startState){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove()}var n=t.getStateById(e);n.objReference.append("line").attr("class","transition-line start-line").attr("x1",0).attr("y1",-75).attr("x2",0).attr("y2",0-l.settings.stateRadius-4).attr("marker-end","url(#marker-end-arrow)")},l.removeStartState=function(e){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove(),t.config.startState=null,t.updateListener()},l.drawState=function(e){var a=t.getStateById(e),n=l.svgStates.append("g").attr("transform","translate("+a.x+" "+a.y+")").attr("class","state state-"+a.id).attr("object-id",a.id);n.append("circle").attr("class","state-circle").attr("r",l.settings.stateRadius),n.append("circle").attr("class","state-circle hover-circle").attr("r",l.settings.stateRadius),n.append("text").text(a.name).attr("class","state-text").attr("dominant-baseline","central").attr("text-anchor","middle");return a.objReference=n,n.on("click",l.openStateMenu).call(l.dragState),n},l.setStateClassAs=function(e,a,n){var i=t.getStateById(e).objReference;i.classed(n,a)},l.setTransitionClassAs=function(e,a,n){var i=t.getTransitionById(e),r=l.getDrawnTransition(i.fromState,i.toState).objReference;r.classed(n,a),a&&"animated-transition"==n?r.select(".transition-line").attr("marker-end","url(#marker-end-arrow-animated)"):r.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.setArrowMarkerTo=function(t,e){""!==e?t.select(".transition-line").attr("marker-end","url(#marker-end-arrow-"+e+")"):t.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.openStateMenu=function(){console.log("open state menu"),l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply(),l.preventSvgOuterClick=!0,l.showStateMenu=!0,l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.input={},l.input.state=l.selectedState,l.input.stateName=l.selectedState.name,l.input.startState=t.config.startState==l.selectedState.id,l.input.finalState=t.isStateAFinalState(l.selectedState.id),l.input.ttt="",l.input.tttisopen=!1,t.safeApply(),l.stateMenuListener=[],l.stateMenuListener.push(t.$watch("statediagram.input.startState",function(e,a){e!==a&&(l.input.startState?t.changeStartState(l.input.state.id):l.selectedState.id==t.config.startState&&t.removeStartState())})),l.stateMenuListener.push(t.$watch("statediagram.input.finalState",function(e,a){e!==a&&(l.input.finalState?t.addFinalState(l.input.state.id):t.removeFinalState(l.input.state.id))})),l.stateMenuListener.push(t.$watch("statediagram.input.stateName",function(e,a){if(l.input.tttisopen=!1,e!==a)if(""===e||t.existsStateWithName(e))""===e?(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_TOO_SHORT"):t.existsStateWithName(e,l.input.state.id)&&(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_ALREADY_EXIST");else{!t.renameState(l.input.state.id,e)}}))},l.closeStateMenu=function(){_.forEach(l.stateMenuListener,function(t,e){t()}),null!==l.selectedState&&l.toggleState(l.selectedState.id,!1),l.stateMenuListener=null,l.showStateMenu=!1,l.input=null},l.toggleState=function(t,e){l.setStateClassAs(t,e,"active"),e===!1&&(l.selectedState=null)},l.dragState=d3.behavior.drag().on("dragstart",function(){l.dragAmount=0,d3.event.sourceEvent.stopPropagation()}).on("drag",function(){if(1==d3.event.sourceEvent.which&&!l.preventStateDragging){l.dragAmount++;var e=d3.event.x,a=d3.event.y;if(l.snapping){var n=e-e%l.gridSpace,i=a-a%l.gridSpace;e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n,a=i):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n+l.gridSpace,a=i):e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance?(e=n,a=i+l.gridSpace):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance&&(e=n+l.gridSpace,a=i+l.gridSpace)}if(l.dragAmount>1){d3.select(this).attr("transform","translate("+e+" "+a+")");var r=d3.select(this).attr("object-id"),s=t.getStateById(r);s.x=e,s.y=a,l.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"))}}}).on("dragend",function(){l.dragAmount>1&&t.safeApply()}),l.selfTransition=function(t,e){return l.bezierLine([[t-l.stateSelfReferenceNumber,e-l.stateSelfReferenceNumber],[t-l.stateSelfReferenceNumber-u,e-l.stateSelfReferenceNumber-f],[t-l.stateSelfReferenceNumber-u,e+l.stateSelfReferenceNumber+f],[t-l.stateSelfReferenceNumber,e+l.stateSelfReferenceNumber]])};var g=30;l.bezierLine=d3.svg.line().x(function(t){return t[0]}).y(function(t){return t[1]}).interpolate("basis"),l.getTransitionDrawConfig=function(e,n){var c=3,u={};u.approachTransition=n||l.existsDrawnTransition(e.toState,e.fromState);var f,m=t.getStateById(e.fromState),g=t.getStateById(e.toState),S=t.isStateAFinalState(e.toState),p=m.x,v=m.y,h=g.x,T=g.y,x={x:h-p,y:T-v},y=Math.sqrt(x.x*x.x+x.y*x.y),A=l.settings.stateRadius/y;f=S?(l.settings.stateRadius+c+5)/y:(l.settings.stateRadius+c)/y,u.xStart=p+A*x.x,u.yStart=v+A*x.y,u.xEnd=h-f*x.x,u.yEnd=T-f*x.y,u.xDiff=h-p,u.yDiff=T-v,u.xMid=(p+h)/2,u.yMid=(v+T)/2,u.distance=Math.sqrt(u.xDiff*u.xDiff+u.yDiff*u.yDiff);var w,I,M={x:u.xMid-u.xStart,y:u.yMid-u.yStart,z:0},D={x:0,y:0,z:1},b={x:1,y:0,z:0};if(w=20,I=a(M,D),I=s(I),I=r(I,w),u.approachTransition){var C=d({x:u.xStart-p,y:u.yStart-v},{x:l.settings.stateRadius,y:0}),L=d({x:u.xEnd-h,y:u.yEnd-T},{x:l.settings.stateRadius,y:0});u.xStart=p+l.settings.stateRadius*Math.cos(i(C.upperAngle)),u.yStart=v-l.settings.stateRadius*Math.sin(i(C.upperAngle)),u.xEnd=h+l.settings.stateRadius*Math.cos(i(L.lowerAngle)),u.yEnd=T-l.settings.stateRadius*Math.sin(i(L.lowerAngle))}w=35,I=a(M,D),I=s(I),I=r(I,w),u.xMidCurv=I.x+u.xMid,u.yMidCurv=I.y+u.yMid;var k,R=(l.existsDrawnTransition(m.id,g.id),l.getDrawnTransition(m.id,g.id));k=R?R.names.length:1;var E,N,_=o(M,b),B=_.degree;B>90&&(B=90-B%90);var O=Math.pow(B/90,.5);E=u.approachTransition?40+8*k*O:12+8*k*O,N=a(M,D),N=s(N),N=r(N,E),u.xText=N.x+u.xMid,u.yText=N.y+u.yMid;var F=[];return F=u.approachTransition?[[u.xStart,u.yStart],[u.xMidCurv,u.yMidCurv],[u.xEnd,u.yEnd]]:[[u.xStart,u.yStart],[u.xEnd,u.yEnd]],u.path=l.bezierLine(F),u},l.writeTransitionText=function(e,a){e.selectAll("*").remove();for(var n=0;n<a.length;n++)null!==t.simulator.animated.transition&&a[n].id===t.simulator.animated.transition.id?e.append("tspan").attr("transition-id",a[n].id).text(a[n].name).classed("animated-transition-text",!0):e.append("tspan").attr("transition-id",a[n].id).text(a[n].name),n<a.length-1&&e.append("tspan").text(" | ")},l.drawTransition=function(e){var a=t.getTransitionById(e);if(!l.existsDrawnTransition(a.fromState,a.toState)){var n=l.svgTransitions.append("g").attr("class","transition"),i=(n.append("path").attr("class","transition-line-selection").attr("fill","none").attr("marker-end","url(#marker-end-arrow-selection)"),n.append("path").attr("class","transition-line").attr("fill","none").attr("marker-end","url(#marker-end-arrow)"),n.append("path").attr("class","transition-line-click").attr("stroke-width",20).attr("stroke","transparent").attr("fill","none"),n.append("path").attr("class","transition-line-hover").attr("fill","none").attr("marker-end","url(#marker-end-arrow-hover)"),n.append("text").attr("class","transition-text").attr("dominant-baseline","central").attr("fill","black"));if(a.fromState!=a.toState){var r=l.getTransitionDrawConfig(a);if(r.approachTransition){var s=l.getDrawnTransition(a.toState,a.fromState),o=l.getTransitionDrawConfig(s,!0);l.updateTransitionLines(s.objReference,o.path),s.objReference.select(".transition-text").attr("x",o.xText).attr("y",o.yText)}i.attr("class","transition-text").attr("x",r.xText).attr("y",r.yText),l.updateTransitionLines(n,r.path)}else{var c=t.getArrayStateIdByStateId(a.fromState),d=t.config.states[c].x,u=t.config.states[c].y;l.updateTransitionLines(n,l.selfTransition(d,u)),i.attr("x",d-l.settings.stateRadius-50).attr("y",u)}return n.attr("object-id",t.config.drawnTransitions.push({fromState:a.fromState,toState:a.toState,names:[{id:a.id,name:a.name}],objReference:n})-1),l.writeTransitionText(i,l.getDrawnTransition(a.fromState,a.toState).names),n.attr("from-state-id",a.fromState).attr("to-state-id",a.toState).on("click",l.openTransitionMenu).on("mouseover",function(){
d3.select(this).select(".transition-line-hover").attr("style","opacity:0.6")}).on("mouseleave",function(){d3.select(this).select(".transition-line-hover").attr("style","")}),n}var f=l.getDrawnTransition(a.fromState,a.toState);f.names.push({id:a.id,name:a.name}),l.writeTransitionText(f.objReference.select(".transition-text"),l.getDrawnTransition(a.fromState,a.toState).names);var m=l.getTransitionDrawConfig(a);f.objReference.select(".transition-text").attr("x",m.xText).attr("y",m.yText)},l.updateTransitionLines=function(t,e){t.select(".transition-line").attr("d",e),t.select(".transition-line-selection").attr("d",e),t.select(".transition-line-hover").attr("d",e),t.select(".transition-line-click").attr("d",e)},l.openTransitionMenu=function(e){l.closeStateMenu(),l.closeTransitionMenu(),l.preventSvgOuterClick=!0,l.showTransitionMenu=!0;var a,n;if(void 0===e)a=d3.select(this).attr("from-state-id"),n=d3.select(this).attr("to-state-id"),l.selectedTransition=l.getDrawnTransition(a,n);else{var i=t.getTransitionById(e);a=i.fromState,n=i.toState,l.selectedTransition=l.getDrawnTransition(a,n)}l.selectedTransition.objReference.classed("active",!0),l.input={},l.input.fromState=t.getStateById(a),l.input.toState=t.getStateById(n),l.input.transitions=[],_.forEach(l.selectedTransition.names,function(t,a){var n={};n=cloneObject(t),void 0!==e?t.id==e&&(n.isFocus=!0):l.selectedTransition.names.length-1===a&&(n.isFocus=!0),n.ttt="",n.tttisopen=!1,l.input.transitions.push(n)}),l.transitionMenuListener=[];for(var r=0;r<l.input.transitions.length;r++)l.transitionMenuListener.push(t.$watchCollection("statediagram.input.transitions['"+r+"']",function(e,i){e.name!==i.name&&(e.tttisopen=!1,""===e.name||t.existsTransition(a,n,e.name)?""===e.name?(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_TOO_SHORT"):t.existsTransition(a,n,e.name,e.id)&&(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_ALREAD_EXISTS"):t.renameTransition(e.id,e.name),console.log(t.existsTransition(a,n,e.name,e.id)))}));t.safeApply()},l.closeTransitionMenu=function(){_.forEach(l.transitionMenuListener,function(t,e){t()}),l.showTransitionMenu=!1,null!==l.selectedTransition&&(l.selectedTransition.objReference.classed("active",!1),l.selectedTransition=null)},l.updateTransitionsAfterStateDrag=function(e){t.config.states[t.getArrayStateIdByStateId(e)].name;_.forEach(t.config.drawnTransitions,function(a,n){if(a.fromState==e||a.toState==e){var i=a.objReference,r=i.select("text");if(a.fromState!=a.toState){var s=l.getTransitionDrawConfig(a);l.updateTransitionLines(i,s.path),r.attr("x",s.xText).attr("y",s.yText)}else{var o=a.fromState,c=t.config.states[t.getArrayStateIdByStateId(o)].x,d=t.config.states[t.getArrayStateIdByStateId(o)].y;l.updateTransitionLines(i,l.selfTransition(c,d)),r.attr("x",c-l.settings.stateRadius-50).attr("y",d)}}})},t.$watch("simulator.animated.currentState",function(e,a){e!==a&&(console.log("CURRENTSTATE:oldValue "+a+" newvalue "+e),console.log("status"+t.simulator.status),null!==a&&(l.setStateClassAs(a,!1,"animated-currentstate-svg"),l.setStateClassAs(a,!1,"animated-accepted-svg"),l.setStateClassAs(a,!1,"animated-not-accepted-svg")),null!==e&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"):l.setStateClassAs(e,!0,"animated-currentstate-svg")))}),t.$watch("simulator.animated.transition",function(t,e){t!==e&&(null!==e&&(l.setTransitionClassAs(e.id,!1,"animated-transition"),d3.selectAll("[transition-id='"+e.id+"'").classed("animated-transition-text",!1)),null!==t&&(l.setTransitionClassAs(t.id,!0,"animated-transition"),console.log(t),d3.selectAll("[transition-id='"+t.id+"'").classed("animated-transition-text",!0)))}),t.$watch("simulator.animated.nextState",function(t,e){t!==e&&(console.log("NEXTSTATE: oldValue "+e+" newvalue "+t),null!==e&&l.setStateClassAs(e,!1,"animated-nextstate-svg"),null!==t&&l.setStateClassAs(t,!0,"animated-nextstate-svg"))}),t.$watch("simulator.status",function(e,a){e!==a&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status&&l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"))})}function StatetransitionfunctionDFA(t){"use strict";var e=this;e.functionData={},e.functionData.states=[],e.functionData.startState="",e.functionData.finalStates="",e.functionData.transitions="",e.functionData.statetransitionfunction=[],t.updateListeners.push(e),e.updateFunction=function(){var a,n="",i="",r="",s="";e.functionData.transitions=t.config.alphabet,e.functionData.states=[],_.forEach(t.config.states,function(a,i){n="";var r="";null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id&&(r="selected"),n+=a.id==t.simulator.animated.currentState&&"accepted"===t.simulator.status?'<span class="animated-accepted '+r+'">':a.id==t.simulator.animated.currentState&&"not accepted"===t.simulator.status?'<span class="animated-not-accepted '+r+'">':a.id==t.simulator.animated.currentState?'<span class="animated-currentstate '+r+'">':'<span class="'+r+'">',n+=a.name,n+="</span>",i<t.config.states.length-1&&(n+=", "),e.functionData.states.push(n)}),e.functionData.statetransitionfunction=[],_.forEach(t.config.states,function(a,n){_.forEach(t.config.transitions,function(n,r){if(n.fromState===a.id){var s=n,o=!1;null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{id:n.id})&&(o=!0);var c=!1;t.simulator.animated.transition&&t.simulator.animated.transition.id===s.id&&(c=!0),i=c||o?'(<span class=" '+(c?"animated-transition":"")+" "+(o?"selected":"")+'">':"(<span>",i+=t.getStateById(s.fromState).name+", ",i+=s.name+", ",i+=t.getStateById(s.toState).name+"</span>)",e.functionData.statetransitionfunction.push(i)}})}),a=t.getStateById(t.config.startState),void 0!==a&&(r+='<span class="">'+a.name+"</span>"),e.functionData.startState=r,_.forEach(t.config.finalStates,function(e,a){e=t.getStateById(e),s=e.name,a<t.config.finalStates.length-1&&(s+=", ")}),e.functionData.finalStates=s},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.status",function(t,a){t!==a&&e.updateFunction()})}function TableDFA(t){var e=this;e.states=[],t.updateListeners.push(e),e.updateFunction=function(){e.states=[],e.alphabet=[];t.config;_.forEach(t.config.alphabet,function(a,n){var i="";null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{name:a})&&(i="selected");var r;r=t.simulator.animated.transition&&t.simulator.animated.transition.name===a?'<span class="animated-transition '+i+'">'+a+"</span>":'<span class="'+i+'">'+a+"</span>",e.alphabet.push(r)}),_.forEach(t.config.states,function(a,n){var i={};i.id=a.id;var r="";if((null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id||null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.fromState===a.id)&&(r="selected"),t.simulator.animated.currentState==a.id){var s="";s="accepted"===t.simulator.status?"animated-accepted":"not accepted"===t.simulator.status?"animated-not-accepted":"animated-currentstate",i.name='<span class="'+s+" "+r+'">'+a.name+"</span>"}else i.name='<span class="'+r+'">'+a.name+"</span>";t.isStateAFinalState(a.id)?i.finalState=!0:i.finalState=!1,t.config.startState===a.id?i.startState=!0:i.startState=!1,i.trans=[],_.forEach(t.config.alphabet,function(e,n){var r=null;_.forEach(t.config.transitions,function(t,n){t.fromState===a.id&&t.name===e&&(r=t)});var s={};if(s.alphabet=e,null!==r){var o=t.getStateById(r.toState),c="";null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.toState===o.id&&(c="selected"),t.simulator.animated.nextState==o.id&&r.name==t.simulator.animated.transition.name?s.State='<span class="animated-nextstate '+c+'">'+o.name+"</span>":s.State='<span class="'+c+'">'+o.name+"</span>"}else s.State="";i.trans.push(s)}),e.states.push(i)})},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.nextState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()})}
//Simulator for the simulation of the automata
function SimulationDFA($scope) {
    "use strict";
    var self = this;

    //saves if the animation is in playmode
    self.isInPlay = false;
    //if the simulation loops (start at the end again)
    self.loopSimulation = true;
    //time between the steps
    self.stepTimeOut = 1500;
    //Time between loops when the animation restarts
    self.loopTimeOut = 2000;
    //if the simulation is paused
    self.simulationPaused = false;
    //simulationsettings
    self.simulationSettings = true;

    //
    self.currentState = null;
    self.nextState = null;
    self.transition = null;


    //
    self.isInputAccepted = false;

    self.settings = function () {
        self.simulationSettings = !self.simulationSettings;
    };
    self.animated = {
        currentState: null,
        transition: null,
        nextState: null
    };

    /**
     * Should reset the simulation
     */
    self.reset = function () {
        //reset animation
        self.animated = {
            currentState: null,
            transition: null,
            nextState: null
        };
        //stack of the gone transitions
        self.goneTransitions = [];
        //Animation Settings
        //saves the currentStateId -> for animating
        self.currentState = $scope.config.startState;
        //saves the nextTransition for animating
        self.transition = null;
        //saves if the transition is animated
        self.animatedTransition = false;
        //saves the nextState for animating
        self.nextState = null;
        //saves if the nextState is animated
        self.animatedNextState = false;
        //saves if we already calculated the next step
        self.isNextStepCalculated = false;
        //saves if the simulationStarted
        self.simulationStarted = false;

        //Simulation Settings
        //saves the States we gone through
        self.statusSequence = [$scope.config.startState];
        //saves the steps we made T.
        self.madeSteps = 0;
        //the word we want to check
        self.inputWord = $scope.config.inputWord;
        //the word we already checked
        self.processedWord = '';
        //the char we checked at the step
        self.nextChar = '';
        //the status is stopped at when resetted
        self.status = 'stopped';
    };

    /**
     * Pause the simulation
     */
    self.pause = function () {
        if (!self.simulationPaused) {
            self.simulationPaused = true;
            self.isInPlay = false;
        }
    };

    /**
     * Stops the simulation
     */
    self.stop = function () {
        self.pause();
        self.reset();
    };

    /**
     * Play the simulation
     */
    self.play = function () {

        //if the simulation is paused then return
        if (!self.simulationPaused) {
            //start and prepare for the play
            if (!self.simulationStarted) {
                self.prepareSimulation();
            } else {
                //loop through the steps
                if (self.isNextStepCalculated || ((self.status != 'accepted') && (self.status != 'not accepted'))) {
                    self.animateNextMove();
                    $scope.safeApply(function () {});
                    if (self.isNextStepCalculated || ((self.status != 'accepted') && (self.status != 'not accepted'))) {
                        setTimeout(self.play, self.stepTimeOut);
                    }
                }
                //end the animation & reset it if loop through is activated the animation loop throuh play
                if (!self.isNextStepCalculated && self.status == 'accepted') {
                    if (self.loopSimulation) {
                        setTimeout(self.play, self.loopTimeOut);
                        //finish the Animation
                    } else {
                        self.isInPlay = false;
                    }
                    self.simulationStarted = false;
                    $scope.safeApply(function () {});
                }
            }
        } else {
            return;
        }
    };

    /**
     * Prepare the simulation ( set startSettings)
     */
    self.prepareSimulation = function () {
        //The simulation always resets the parameters at the start -> it also sets the inputWord
        self.reset();
        self.simulationStarted = true;
        self.animated.currentState = _.last(self.statusSequence);

        $scope.safeApply();
        setTimeout(self.play, self.loopTimeOut);
    };

    /**
     * animate the next Move (a step has more than three moves)
     */
    self.animateNextMove = function () {
        if (!self.isNextStepCalculated) {
            self.calcNextStep();
        }

        //First: Paint the transition & wait
        if (!self.animatedTransition) {
            self.animatedTransition = true;
            self.animated.transition = self.transition;
            self.goneTransitions.push(self.transition);

            //Second: Paint the nextstate & wait
        } else if (!self.animatedNextState && self.animatedTransition) {
            self.animatedNextState = true;
            self.animated.nextState = self.nextState;


            //Third: clear transition & currentStatecolor and set currentState = nexsttate and wait
        } else if (self.animatedTransition && self.animatedNextState) {
            self.animated.transition = null;
            self.animated.nextState = null;
            self.animated.currentState = self.nextState;

            self.currentState = self.nextState;
            //after the step was animated it adds a step to the madeSteps
            self.madeSteps++;
            //if the nextState is the finalState
            if (self.inputWord.length == self.madeSteps) {
                if (_.include($scope.config.finalStates, self.currentState)) {
                    self.status = 'accepted';
                } else {
                    self.status = 'not accepted';
                }
            }



            //Reset the step & start the next step
            self.isNextStepCalculated = false;
            self.animatedNextState = false;
            self.animatedTransition = false;
            self.processedWord += self.nextChar;

            //push the currentState to the statusSequence
            self.statusSequence.push(self.currentState);

            //check if there is a next transition
            if (self.status !== "accepted" && self.status !== "not accepted")
                self.calcNextStep();
        }

    };

    /**
     * calcs the next step
     */
    self.calcNextStep = function () {
        self.isNextStepCalculated = true;
        self.status = 'step';
        self.nextChar = self.inputWord[self.madeSteps];

        //get the next transition
        self.transition = _.filter($scope.config.transitions, function (transition) {
            //if there is no next char then the word is not accepted
            if (self.nextChar === undefined) {
                self.status = 'not accepted';
                return;
            }
            //get the nextState
            return transition.fromState == _.last(self.statusSequence) && transition.name == self.nextChar;
        });
        //if there is no next transition, then the word is not accepted
        if (_.isEmpty(self.transition)) {
            self.transition = null;
            self.status = 'not accepted';
            return;
        }
        //save transition and nextState for the animation
        self.transition = self.transition[0];
        self.nextState = self.transition.toState;
    };

    /**
     * pause the simulation and then stepForward steps to the nextAnimation ( not a whole step)
     */
    self.stepForward = function () {
        if (!self.simulationPaused) {
            self.pause();
        }
        if (!self.simulationStarted) {
            self.prepareSimulation();
            self.status = 'step';
            // return if automat is not running
        } else if (!(_.include(['step', 'stopped', 'accepted', 'not accepted'], self.status))) {
            //TODO:DEBUG
            console.log(self.status);
            return;
        } else if (!_.include(['accepted', 'not accepted'], self.status)) {
            self.animateNextMove();
        }
    };


    /**
     * pause the simulation and then steps back to the lastAnimation ( not a whole step)
     * @return {[type]} [description]
     */
    self.stepBackward = function () {
        if (!self.simulationPaused) {
            self.pause();
        }
        // return if automat is not running
        if (!(_.include(['step', 'accepted', 'not accepted'], self.status))) {
            //TODO:DEBUG
            return;
        }
        self.status = 'step';

        // Reset if no more undoing is impossible n-> not right at the moment
        if (!self.animatedTransition && !self.animatedNextState && self.madeSteps === 0) {
            self.reset();
        } else {
            // Decrease count and remove last element from statusSequence
            self.animateLastMove();
        }
    };

    /**
     * animates the last move if there is no lastmove, then calcLastStep
     * @return {[type]} [description]
     */
    self.animateLastMove = function () {
        console.log(self.animatedTransition + " " + self.animatedNextState);
        if (self.animatedTransition && self.animatedNextState) {
            self.animated.nextState = null;
            self.animatedNextState = false;
        } else if (self.animatedTransition) {
            self.animated.transition = null;
            self.animatedTransition = false;
            self.goneTransitions.pop();
        } else {
            self.calcLastStep();
        }

    };

    /**
     * calc the last step
     */
    self.calcLastStep = function () {
        self.nextChar = self.processedWord.slice(-1);
        console.log(self.nextChar + " " + self.statusSequence[self.statusSequence.length - 2]);

        //get the gone way back
        self.transition = _.last(self.goneTransitions);
        console.log(self.transition);
        _.pullAt(self.goneTransitions, self.goneTransitions.length);
        //First: Paint the transition & wait
        self.animatedTransition = true;
        self.animated.transition = self.transition;
        var tmp = self.currentState;
        self.currentState = self.transition.fromState;
        self.nextState = tmp;
        self.animated.nextState = self.nextState;
        //Second: Paint the nextstate & wait
        self.animatedNextState = true;

        self.animated.currentState = self.currentState;
        self.madeSteps--;
        self.statusSequence.splice(-1, 1);
        self.processedWord = self.processedWord.slice(0, -1);
    };

    self.getNextTransition = function (fromState, transitonName) {
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var transition = $scope.config.transitions[i];
            if (transition.fromState == fromState && transition.name == transitonName) {
                return transition;
            }
        }
        return undefined;
    };
    /**
     * checks if a word is accepted from the automata
     * @return {Boolean} [description]
     */
    self.check = function () {
        //init needed variables
        var accepted = false;
        var statusSequence = [];
        statusSequence.push($scope.config.startState);
        var nextChar = '';
        var madeSteps = 0;
        var transition = null;

        while (madeSteps <= $scope.config.inputWord.length) {
            nextChar = $scope.config.inputWord[madeSteps];
            //get the next transition
            transition = self.getNextTransition(_.last(statusSequence), nextChar);
            //if there is no next transition, then the word is not accepted
            if (_.isEmpty(transition)) {
                break;
            }
            //push the new State to the sequence
            statusSequence.push(transition.toState);
            madeSteps++;
            //if outmadeSteps is equal to the length of the inputWord 
            //and our currenState is a finalState then the inputWord is accepted, if not its not accepted
            if ($scope.config.inputWord.length == madeSteps) {
                if (_.include($scope.config.finalStates, _.last(statusSequence))) {
                    accepted = true;
                    break;
                } else {
                    break;
                }
            }
        }
        return accepted;
    };


    //BUTTONS NEED DIRECTIVES
    /**
     *  Checks if the automata is playable ( has min. 1 states and 1 transition and automat has a start and a finalstate)
     * @return {Boolean} [description]
     */
    self.isPlayable = function () {
        return $scope.config.states.length >= 1 && $scope.config.transitions.length >= 1 && $scope.config.startState !== null && $scope.config.finalStates.length >= 1;
    };

    /**
     * [playOrPause description]
     * @return {[type]} [description]
     */
    self.playOrPause = function () {
        //the automat needs to be playable
        if (self.isPlayable()) {
            //change the icon and the state to Play or Pause
            self.isInPlay = !self.isInPlay;
            if (self.isInPlay) {
                self.simulationPaused = false;
                self.play();
            } else {
                self.pause();
            }

        } else {
            //$scope.dbug.debugDanger("Kein Automat vorhanden!");
        }

    };

    $scope.updateListeners.push(self);
    self.updateFunction = function () {
        self.isInputAccepted = self.check();
    };




}
//statediagram for the svg diagramm
function StateDiagramDFA($scope, svgSelector) {
    "use strict";

    var self = this;

    self.preventStateDragging = false;
    self.inAddTransition = false;
    self.selectedState = null;

    //prevents call from the svouterclicklistener
    self.preventSvgOuterClick = false;
    self.selectedTransition = null;
    self.showStateMenu = false;
    self.showTransitionMenu = false;
    self.selectedStateName = "selectedForTransition";
    //user can snap the states to the grid -> toggles snapping
    self.snapping = true;

    //statediagram settings
    self.settings = {
        stateRadius: 25,
        finalStateRadius: 29,
        selected: false
    };
    //is for the selfReference
    var stretchX = 40;
    var stretchY = 18;

    //for the selfReference transition
    self.stateSelfReferenceNumber = Math.sin(45 * (Math.PI / 180)) * self.settings.stateRadius;

    /**
     * Check if transition already drawn
     * @param   {number}  fromState 
     * @param   {number}  toState   
     * @returns {boolean}
     */
    self.existsDrawnTransition = function (fromState, toState) {

        var tmp = false;
        for (var i = 0; i < $scope.config.drawnTransitions.length; i++) {
            var transition = $scope.config.drawnTransitions[i];
            if (transition.fromState == fromState && transition.toState == toState) {
                tmp = true;
            }
        }
        return tmp;
    };

    /**
     * Get a drawn Transition
     * @param   {number} fromState 
     * @param   {number} toState   
     * @returns {object} 
     */
    self.getDrawnTransition = function (fromState, toState) {
        for (var i = 0; i < $scope.config.drawnTransitions.length; i++) {
            var transition = $scope.config.drawnTransitions[i];
            if (transition.fromState == fromState && transition.toState == toState) {
                return transition;
            }
        }
        return undefined;
    };

    /**
     * Clears the svgContent, resets scale and translate and delete drawnTransitionContent
     */
    self.clearSvgContent = function () {
        //first close Menus
        self.closeStateMenu();
        self.closeTransitionMenu();
        //Clear the content of the svg
        self.svgTransitions.html("");
        self.svgStates.html("");
        $scope.config.drawnTransitions = [];
        //change the scale and the translate to the defaultConfit
        self.svg.attr("transform", "translate(" + $scope.defaultConfig.diagramm.x + "," + $scope.defaultConfig.diagramm.y + ")" + " scale(" + $scope.defaultConfig.diagramm.scale + ")");
        svgOuterZoomAndDrag.scale($scope.defaultConfig.diagramm.scale);
        svgOuterZoomAndDrag.translate([$scope.defaultConfig.diagramm.x, $scope.defaultConfig.diagramm.y]);

    };

    /****ZOOMHANDLER START***/
    //amount the user can zoom out
    self.zoomMax = 2.5;
    //amount the user can zoom in
    self.zoomMin = 0.5;
    self.zoomValue = 0.1;

    self.zoomIn = function () {
        $scope.config.diagramm.scale = ($scope.config.diagramm.scale + self.zoomValue) > self.zoomMax ? $scope.config.diagramm.scale : Math.floor(($scope.config.diagramm.scale + self.zoomValue) * 100) / 100;
        self.updateZoomBehaviour();
    };
    self.zoomOut = function () {

        $scope.config.diagramm.scale = ($scope.config.diagramm.scale - self.zoomValue) <= self.zoomMin ? $scope.config.diagramm.scale : Math.floor(($scope.config.diagramm.scale - self.zoomValue) * 100) / 100;
        self.updateZoomBehaviour();

    };

    /**
     * This method zooms the svg to a specific scale
     * @param {number} value the zoom value
     */
    self.zoomTo = function (value) {
        console.log("zoomtedto");
        $scope.config.diagramm.scale = value / 100;
        $scope.safeApply();
        self.updateZoomBehaviour();
    };

    /**
     * This method updates the d3 zoombehaviour (fixes weird bugs)
     */
    self.updateZoomBehaviour = function () {
        $scope.safeApply();
        self.svg.attr("transform", "translate(" + $scope.config.diagramm.x + "," + $scope.config.diagramm.y + ")" + " scale(" + $scope.config.diagramm.scale + ")");
        svgOuterZoomAndDrag.scale($scope.config.diagramm.scale);
        svgOuterZoomAndDrag.translate([$scope.config.diagramm.x, $scope.config.diagramm.y]);
    };

    /**
     * This method zooms the svg to a calculated scale, so the complete svg fits in the window
     */
    self.zoomFitWindow = function () {
        var stateXCoor = [];
        var stateYCoor = [];
        var minX = 0;
        var maxX = 0;
        var minY = 0;
        var maxY = 0;
        var topShifting = 0;
        var leftShifting = 0;
        var i;
        var obj;
        var width = self.svgOuter.style("width").replace("px", "");
        var height = self.svgOuter.style("height").replace("px", "");

        /*
         * set the diagrammscale on 100%. We got the advantage, that the method also zoom in, if the automaton doesn't fit the window. 
         * But the method doesn't really zoom in. It sets the scale on 100% an then zoom out.
         */
        $scope.config.diagramm.scale = 1.0;

        /**
         * check if there exist at least one state. If the diagram is empty, there is nothing to fit the window.
         * The state with the lowest x- and y-coordinate defines the minimum-x- and minimum-y-coordinate from the automaton.
         * The state with the highest x- and y-coordinate defines the maximum-x- and maximum-y-coordiante from the automaten
         */

        if ($scope.config.states.length > 0) {
            for (i = 0; i < $scope.config.states.length; i++) {
                stateXCoor[i] = $scope.config.states[i].x;
            }

            for (i = 0; i < $scope.config.states.length; i++) {
                stateYCoor[i] = $scope.config.states[i].y;
            }
            minX = _.min(stateXCoor);
            maxX = _.max(stateXCoor);
            minY = _.min(stateYCoor);
            maxY = _.max(stateYCoor);

            /* 
             * While the size of the automaton is bigger than the diagram, zoom out. 
             * We work with the width and the height from the diagram proportional to the scale.
             */
            while (((maxX - minX + 150) > (width / $scope.config.diagramm.scale)) || ((maxY - minY + 200) > (height / $scope.config.diagramm.scale))) {
                $scope.config.diagramm.scale -= 0.01;
            }
            $scope.safeApply();

            //Calculation of a topshifting and a leftshifting, so the automaton is centered in the diagram.
            topShifting = (((height / $scope.config.diagramm.scale) - (maxY - minY)) / 2);
            leftShifting = (((width / $scope.config.diagramm.scale) - (maxX - minX)) / 2);

            //set the diagram-x and -y values and update the diagram.
            $scope.config.diagramm.x = -(minX * $scope.config.diagramm.scale) + (leftShifting * $scope.config.diagramm.scale);
            $scope.config.diagramm.y = -(minY * $scope.config.diagramm.scale) + (topShifting * $scope.config.diagramm.scale);
            self.updateZoomBehaviour();
        } else {
            self.scaleAndTranslateToDefault();
        }
    };

    /**
     * Scale and Translate the Svg to the default Value
     */
    self.scaleAndTranslateToDefault = function () {
        $scope.config.diagramm.scale = $scope.defaultConfig.diagramm.scale;
        $scope.config.diagramm.x = $scope.defaultConfig.diagramm.x;
        $scope.config.diagramm.y = $scope.defaultConfig.diagramm.y;
        $scope.safeApply();
        self.updateZoomBehaviour();
    };

    //the svgouterzoom and drag listener
    var svgOuterZoomAndDrag = d3.behavior
        .zoom()
        .scaleExtent([self.zoomMin, self.zoomMax])
        .on("zoom", function () {
            var stop = d3.event.button || d3.event.ctrlKey;
            if (stop) d3.event.stopImmediatePropagation(); // stop zoom
            //dont translate on right click (3)
            if (d3.event.sourceEvent.which !== 3) {
                var newScale = Math.floor(d3.event.scale * 100) / 100;

                $scope.config.diagramm.scale = newScale;
                $scope.config.diagramm.x = d3.event.translate[0];
                $scope.config.diagramm.y = d3.event.translate[1];
                $scope.safeApply();
                self.svg.attr("transform", "translate(" + $scope.config.diagramm.x + "," + $scope.config.diagramm.y + ")" + " scale(" + $scope.config.diagramm.scale + ")");
            } else {
                console.log("rightclick!");
            }
        });


    //prevents the normal rightclickcontextmenu and add zoom
    self.svgOuter = d3.select(svgSelector)
        .call(svgOuterZoomAndDrag)
        //prevents doubleclick zoom
        .on("dblclick.zoom", null)
        //adds our custom context menu on rightclick
        .on("contextmenu", function () {
            d3.event.preventDefault();
        });

    /**
     * Click Listener when clicking on the outer svg =(not clicking on state or transition)
     */
    self.addSvgOuterClickListener = function () {
        self.svgOuter.on("click", function () {
            if (!self.preventSvgOuterClick) {
                self.closeStateMenu();
                self.closeTransitionMenu();
                $scope.safeApply();
            } else {
                //remove clickbool
                self.preventSvgOuterClick = false;
            }
        });
    };

    //add at the start
    self.addSvgOuterClickListener();

    //the html element where we put the svgGrid into
    self.svgGrid = self.svgOuter.append("g").attr("id", "grid");

    //inner svg
    self.svg = self.svgOuter
        .append("g")
        .attr("id", "svg-items");


    //first draw the transitions -> nodes are in front of them if they overlap
    self.svgTransitions = self.svg.append("g").attr("id", "transitions");
    self.svgStates = self.svg.append("g").attr("id", "states");



    //the space between each SnappingPoint 1:(0,0)->2:(0+gridSpace,0+gridSpace)
    self.gridSpace = 100;
    //the distance when the state is snapped to the next SnappingPoint (Rectangle form)
    self.gridSnapDistance = 20;
    //is Grid drawn
    self.isGrid = true;

    //watcher for the grid when changed -> updateGrid
    $scope.$watch('[statediagram.isGrid , config.diagramm]', function () {
        self.drawGrid();
    }, true);

    /**
     * Draw the Grid
     */
    self.drawGrid = function () {
        if (self.isGrid) {
            //clear grid
            self.svgGrid.html("");
            var width = self.svgOuter.style("width").replace("px", "");
            var height = self.svgOuter.style("height").replace("px", "");
            var thickness = 1 * $scope.config.diagramm.scale * 0.5;
            var xOffset = ($scope.config.diagramm.x % (self.gridSpace * $scope.config.diagramm.scale));
            var yOffset = ($scope.config.diagramm.y % (self.gridSpace * $scope.config.diagramm.scale));
            var i;
            //xGrid
            for (i = xOffset; i < width; i += self.gridSpace * $scope.config.diagramm.scale) {
                self.svgGrid
                    .append("line")
                    .attr("stroke-width", thickness)
                    .attr("class", "grid-line xgrid-line")
                    .attr("x1", i)
                    .attr("y1", 0)
                    .attr("x2", i)
                    .attr("y2", height);
            }
            //yGrid
            for (i = yOffset; i < height; i += self.gridSpace * $scope.config.diagramm.scale) {
                self.svgGrid
                    .append("line")
                    .attr("stroke-width", thickness)
                    .attr("class", "grid-line ygrid-line")
                    .attr("x1", 0)
                    .attr("y1", i)
                    .attr("x2", width)
                    .attr("y2", i);
            }
        } else {
            //undraw Grid
            self.svgGrid.html("");
        }
    };


    //DEFS
    self.defs = self.svg.append('svg:defs');
    //Marker-Arrow ( for the transitions)
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-create')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-animated')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-hover')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-selection')
        .attr('refX', 4)
        .attr('refY', 3)
        .attr('markerWidth', 5)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');


    /**
     * Reset all the AddListeners
     */
    self.resetAddActions = function () {
        self.closeStateMenu();
        self.closeTransitionMenu();
        self.svgOuter.on("click", null);
        self.inAddTransition = false;
        self.inAddState = false;
    };

    /**
     * AddState -> creates a new state when clicked on the button with visual feedback
     */
    self.addState = function () {
        self.resetAddActions();
        //add listener that the selectedstate follows the mouse
        self.svgOuter.on("mousemove", function () {
            //move the state (only moved visually not saved)
            self.selectedState.objReference.attr("transform", "translate(" + (((d3.mouse(this)[0]) - $scope.config.diagramm.x) * (1 / $scope.config.diagramm.scale)) + " " +
                (((d3.mouse(this)[1]) - $scope.config.diagramm.y) * (1 / $scope.config.diagramm.scale)) + ")");
        });
        //create a new selectedState in a position not viewable
        self.selectedState = $scope.addStateWithPresets(-10000, -10000);
        //add a class to the state (class has opacity)
        self.selectedState.objReference.classed("state-in-creation", true);
        self.svgOuter.on("click", function () {
            //remove class
            self.selectedState.objReference.classed("state-in-creation", false);
            //update the stateData
            self.selectedState.x = (((d3.mouse(this)[0]) - $scope.config.diagramm.x) * (1 / $scope.config.diagramm.scale));
            self.selectedState.y = (((d3.mouse(this)[1]) - $scope.config.diagramm.y) * (1 / $scope.config.diagramm.scale));
            self.selectedState.objReference.attr("transform", "translate(" + self.selectedState.x + " " + self.selectedState.y + ")");
            //remove mousemove listener
            self.svgOuter.on("mousemove", null);
            //overwrite the click listener
            self.addSvgOuterClickListener();
            self.preventSvgOuterClick = false;
            $scope.safeApply();

        });
    };

    /**
     * Addtransition function for the icon
     */
    self.addTransition = function () {
        self.resetAddActions();
        //prevent dragging during addTransition
        self.preventStateDragging = true;
        //1. FirstClick: select a state and create a tmpLine for visual feedback
        //SecondClick: Create a transition from selectState to the clickedState
        d3.selectAll(".state").on("click", function () {
            self.mouseInState = true;
            //if there is no selected state then select a state
            if (self.selectedState === null) {
                self.selectedState = $scope.getStateById(parseInt(d3.select(this).attr("object-id")));
                self.toggleState(self.selectedState.id, true);

                //create tmpLine
                self.tmpTransition = self.svgTransitions.append("g")
                    .attr("class", "transition");
                //the line itself with the arrow without the path itself
                self.tmpTransitionline = self.tmpTransition.append("path")
                    .attr("class", "transition-line curvedLine in-creation")
                    .attr("marker-end", "url(#marker-end-arrow-create)")
                    .attr("fill", "none");

                //if already selected a state then create transition to the clickedState
            } else {
                var tmpTransition = $scope.addTransition(self.selectedState.id, parseInt(d3.select(this).attr("object-id")), $scope.getNextTransitionName(self.selectedState.id));
                self.toggleState(self.selectedState.id, false);
                self.tmpTransition.remove();
                self.tmpTransition = null;
                self.tmpTransitionline = null;
                self.preventStateDragging = false;
                //update the svgOuter listeners
                self.addSvgOuterClickListener();
                self.svgOuter.on("mousemove", null);
                //update state listeners
                d3.selectAll(".state").on("mouseover", null);
                d3.selectAll(".state").on("mouseleave", null);
                d3.selectAll('.state').on('click', self.openStateMenu);

                //openTransitionMenu
                self.openTransitionMenu(tmpTransition.id);
            }

        });
        //2. if the mouse moves on the svgOuter and not on a state, then update the tmpLine
        self.svgOuter.on("mousemove", function () {
            if (!self.mouseInState && self.selectedState !== null) {
                var x = (((d3.mouse(this)[0]) - $scope.config.diagramm.x) * (1 / $scope.config.diagramm.scale));
                var y = (((d3.mouse(this)[1]) - $scope.config.diagramm.y) * (1 / $scope.config.diagramm.scale));
                var pathLine = self.bezierLine([[self.selectedState.x, self.selectedState.y], [x, y]]);
                self.tmpTransitionline.attr("d", pathLine);
            }
        });

        //3. if the mouse moves on a state then give a visual feedback how the line connects with the state
        d3.selectAll(".state").on("mouseover", function (i) {
            //see 2.
            self.mouseInState = true;
            //we need an other state to connect the line
            if (self.selectedState !== null) {
                var otherState = $scope.getStateById(d3.select(this).attr("object-id"));
                var transition = {};
                transition.fromState = self.selectedState.id;
                transition.toState = otherState.id;
                var line = self.tmpTransitionline;
                if (!self.existsDrawnTransition(self.selectedState.fromState, self.selectedState.toState)) {
                    //the group element
                    //if it is not a self Reference
                    if (transition.fromState != transition.toState) {
                        var drawConfig = self.getTransitionDrawConfig(transition);
                        //if there is a transition in the other direction
                        if (drawConfig.approachTransition) {
                            //other transition in the other direction
                            var otherTrans = self.getDrawnTransition(transition.toState, transition.fromState);
                            var otherDrawConfig = self.getTransitionDrawConfig(otherTrans, true);
                            self.updateTransitionLines(otherTrans.objReference, otherDrawConfig.path);
                            otherTrans.objReference.select(".transition-text")
                                .attr("x", otherDrawConfig.xText)
                                .attr("y", otherDrawConfig.yText);
                            //update the transition text position
                            self.otherTransition = otherTrans;

                        }
                        //get the curve data ( depends if there is a transition in the oposite direction)
                        line.attr("d", drawConfig.path);
                        //if it is a selfreference
                    } else {
                        var stateId = $scope.getArrayStateIdByStateId(transition.fromState);
                        var x = $scope.config.states[stateId].x;
                        var y = $scope.config.states[stateId].y;
                        line.attr("d", self.selfTransition(x, y));
                    }
                    //if there is already a transition with the same fromState and toState then the current
                } else {
                    //add the name to the drawnTransition
                    var drawnTransition = self.getDrawnTransition(transition.fromState, transition.toState);
                    drawnTransition.names.push(transition.name);
                    //drawn the new name to the old transition (svg)
                    self.writeTransitionText(drawnTransition.objReference.select(".transition-text"), drawnTransition.names);


                }
                self.tmpTransitionline.attr("x1", self.selectedState.x)
                    .attr("y1", self.selectedState.y)
                    .attr("x2", otherState.x)
                    .attr("y2", otherState.y);
            }
        }).on("mouseleave", function () {
            self.mouseInState = false;
            //remove the visual feedback from transition going against our tmpLine
            if (self.otherTransition !== null && self.otherTransition !== undefined) {
                var otherDrawConfig = self.getTransitionDrawConfig(self.otherTransition);
                self.updateTransitionLines(self.otherTransition.objReference, otherDrawConfig.path);
                self.otherTransition.objReference.select(".transition-text")
                    .attr("x", (otherDrawConfig.xText))
                    .attr("y", (otherDrawConfig.yText));
            }
        });
    };

    /**
     * Renames the state in the svg after the $scope variable was changed
     * @param  {number} stateId      
     * @param  {String} newStateName          
     */
    self.renameState = function (stateId, newStateName) {
        var state = $scope.config.states[$scope.getArrayStateIdByStateId(stateId)];
        var objReference = state.objReference;
        objReference.select("text").text(newStateName);
    };

    /**
     * Removes the state with the given id
     * @param  {number} stateId 
     */
    self.removeState = function (stateId) {
        self.closeStateMenu();
        var state = $scope.config.states[$scope.getArrayStateIdByStateId(stateId)];
        var objReference = state.objReference;
        objReference.remove();
    };


    /**
     * Renames a transition
     * @param {number} fromState         the fromStateId
     * @param {number} toState           the toStateID
     * @param {number} transitionId      the transitionid
     * @param {char}   newTransitionName the new transitionname
     */
    self.renameTransition = function (fromState, toState, transitionId, newTransitionName) {
        //change it in drawnTransition
        var drawnTransition = self.getDrawnTransition(fromState, toState);
        var drawnTransitionName = _.find(drawnTransition.names, {
            "id": transitionId
        });
        drawnTransitionName.name = newTransitionName;

        //change it on the svg
        self.writeTransitionText(drawnTransition.objReference.select(".transition-text"), drawnTransition.names);
    };


    /**
     * removes a transition from the svg
     * @param   {number}   transitionId
     */
    self.removeTransition = function (transitionId) {
        var tmpTransition = $scope.getTransitionById(transitionId);
        var tmpDrawnTransition = self.getDrawnTransition(tmpTransition.fromState, tmpTransition.toState);
        var drawConfig = self.getTransitionDrawConfig(tmpTransition);
        self.closeTransitionMenu();
        //if its the only transition in the drawn transition -> then remove the drawn transition
        if (tmpDrawnTransition.names.length === 1) {
            tmpDrawnTransition.objReference.remove();
            _.remove($scope.config.drawnTransitions, function (n) {
                return n == tmpDrawnTransition;
            });
            //if there is an approad transition, then draw it with the new drawconfig
            if (drawConfig.approachTransition) {
                //other transition in the other direction
                var otherTrans = self.getDrawnTransition(tmpTransition.toState, tmpTransition.fromState);
                var otherDrawConfig = self.getTransitionDrawConfig(otherTrans, false);
                self.updateTransitionLines(otherTrans.objReference, otherDrawConfig.path);
                otherTrans.objReference.select(".transition-text")
                    .attr("x", otherDrawConfig.xText)
                    .attr("y", otherDrawConfig.yText);
                //update the transition text position
                self.otherTransition = otherTrans;

            }
        }
        //if there are other transitions with the same from- and tostate, then remove the transition from the names and redraw the text
        else {
            _.remove(tmpDrawnTransition.names, function (n) {
                return n.id == tmpTransition.id;
            });
            self.writeTransitionText(tmpDrawnTransition.objReference.select(".transition-text"), tmpDrawnTransition.names);
            drawConfig = self.getTransitionDrawConfig(tmpTransition);
            tmpDrawnTransition.objReference.select(".transition-text")
                .attr("x", drawConfig.xText)
                .attr("y", drawConfig.yText);
            console.log(tmpDrawnTransition);

            self.openTransitionMenu(tmpDrawnTransition.names[tmpDrawnTransition.names.length - 1].id);

        }


    };

    /**
     * Adds a stateId to the final states on the svg (visual feedback)
     * @param {number} stateId
     */
    self.addFinalState = function (stateId) {
        var state = $scope.getStateById(stateId);
        state.objReference.insert("circle", ".state-circle")
            .attr("class", "final-state")
            .attr("r", self.settings.finalStateRadius);

        //TODO: update the transitions to the state

    };

    /**
     * Removes a final state on the svg
     * @param {number} stateId 
     */
    self.removeFinalState = function (stateId) {
        var state = $scope.getStateById(stateId);
        state.objReference.select(".final-state").remove();
        //TODO update the transitions to the state
    };

    /**
     * Changes the StartState to the stateid
     * @param {number} stateId 
     */
    self.changeStartState = function (stateId) {
        //TODO:
        //remove old startState
        if ($scope.config.startState !== null) {
            var state = $scope.getStateById($scope.config.startState);
            state.objReference.select(".start-line").remove();
        }

        var otherState = $scope.getStateById(stateId);
        otherState.objReference.append("line")
            .attr("class", "transition-line start-line")
            .attr("x1", 0)
            .attr("y1", 0 - 75)
            .attr("x2", 0)
            .attr("y2", 0 - self.settings.stateRadius - 4)
            .attr("marker-end", "url(#marker-end-arrow)");
    };

    /**
     * removes the stateId
     * @param {number} stateId
     */
    self.removeStartState = function (stateId) {
        var state = $scope.getStateById($scope.config.startState);
        state.objReference.select(".start-line").remove();
        $scope.config.startState = null;
        $scope.updateListener();
    };

    /**
     * Draws a State 
     * @param  {number} id the stateid
     * @return {Reference}    Returns the reference of the group object
     */
    self.drawState = function (id) {
        var state = $scope.getStateById(id);
        var group = self.svgStates.append("g")
            .attr("transform", "translate(" + state.x + " " + state.y + ")")
            .attr("class", "state " + "state-" + state.id)
            .attr("object-id", state.id); //save the state-id

        var circle = group.append("circle")
            .attr("class", "state-circle")
            .attr("r", self.settings.stateRadius);
        //for outer circle dotted when selected

        var hoverCircle = group.append("circle")
            .attr("class", "state-circle hover-circle")
            .attr("r", self.settings.stateRadius);

        var text = group.append("text")
            .text(state.name)
            .attr("class", "state-text")
            .attr("dominant-baseline", "central")
            .attr("text-anchor", "middle");

        state.objReference = group;
        group.on('click', self.openStateMenu)
            .call(self.dragState);
        return group;
    };

    /**
     * Adds or remove a class to a state ( only the svg state)
     * @param {number} stateId 
     * @param {Boolean} state   
     * @param {String} className  
     */
    self.setStateClassAs = function (stateId, state, className) {
        var objReference = $scope.getStateById(stateId).objReference;
        objReference.classed(className, state);
    };

    /**
     * Sets a transition class to a specific class or removes the specific class
     * @param {number}   transitionId
     * @param {boolean} state        if the class should be added or removed
     * @param {string}  className    the classname
     */
    self.setTransitionClassAs = function (transitionId, state, className) {
        var trans = $scope.getTransitionById(transitionId);
        var objReference = self.getDrawnTransition(trans.fromState, trans.toState).objReference;
        objReference.classed(className, state);
        if (state && className == 'animated-transition') {
            objReference.select(".transition-line").attr("marker-end", "url(#marker-end-arrow-animated)");
        } else {
            objReference.select(".transition-line").attr("marker-end", "url(#marker-end-arrow)");
        }
    };

    /**
     * sets the arrow marker of a transition, cause we couldnt change the color of an arrow marker
     * @param {object} transLine the transitionlineobject
     * @param {string} suffix    which arrow should be changed
     */
    self.setArrowMarkerTo = function (transLine, suffix) {

        if (suffix !== '') {
            transLine.select('.transition-line').attr("marker-end", "url(#marker-end-arrow-" + suffix + ")");
        } else {
            transLine.select('.transition-line').attr("marker-end", "url(#marker-end-arrow)");
        }
    };


    /**
     * Opens the StateMenu
     */
    self.openStateMenu = function () {
        console.log("open state menu");
        self.closeStateMenu();
        self.closeTransitionMenu();
        //fixes weird errors
        $scope.safeApply();

        self.preventSvgOuterClick = true;
        self.showStateMenu = true;
        self.selectedState = $scope.getStateById(parseInt(d3.select(this).attr("object-id")));
        //add new state as selected
        self.toggleState(self.selectedState.id, true);

        //save the state values in the state context as default value
        self.input = {};
        self.input.state = self.selectedState;
        self.input.stateName = self.selectedState.name;
        self.input.startState = $scope.config.startState == self.selectedState.id;
        self.input.finalState = $scope.isStateAFinalState(self.selectedState.id);
        self.input.ttt = "";
        self.input.tttisopen = false;
        $scope.safeApply();
        self.stateMenuListener = [];
        //Menu watcher
        self.stateMenuListener.push($scope.$watch('statediagram.input.startState', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                if (self.input.startState) {
                    $scope.changeStartState(self.input.state.id);
                } else {
                    if (self.selectedState.id == $scope.config.startState)
                        $scope.removeStartState();
                }
            }

        }));
        self.stateMenuListener.push($scope.$watch('statediagram.input.finalState', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                if (self.input.finalState) {
                    $scope.addFinalState(self.input.state.id);
                } else {
                    $scope.removeFinalState(self.input.state.id);
                }

            }

        }));
        self.stateMenuListener.push($scope.$watch('statediagram.input.stateName', function (newValue, oldValue) {
            //if the name got changed but is not empty
            //reset the tooltip
            self.input.tttisopen = false;
            if (newValue !== oldValue) {
                //change if the name doesnt exists and isnt empty
                if (newValue !== "" && !$scope.existsStateWithName(newValue)) {
                    var renameError = !$scope.renameState(self.input.state.id, newValue);
                } else if (newValue === "") {
                    //FEEDBACK
                    self.input.tttisopen = true;
                    self.input.ttt = 'STATE_MENU.NAME_TOO_SHORT';
                } else if ($scope.existsStateWithName(newValue, self.input.state.id)) {
                    self.input.tttisopen = true;
                    self.input.ttt = 'STATE_MENU.NAME_ALREADY_EXIST';
                }
            }
        }));
    };

    /**
     * closes the state menu
     */
    self.closeStateMenu = function () {
        //remove old StateMenuListeners
        _.forEach(self.stateMenuListener, function (value, key) {
            value();
        });
        if (self.selectedState !== null) {
            self.toggleState(self.selectedState.id, false);
        }
        self.stateMenuListener = null;
        self.showStateMenu = false;

        //delete input
        self.input = null;
    };

    /**
     * toggle a state
     * @param {number} stateId 
     * @param {bool}   bool
     */
    self.toggleState = function (stateId, bool) {
        self.setStateClassAs(stateId, bool, "active");
        if (bool === false) {
            self.selectedState = null;
        }

    };


    //Node drag and drop behaviour
    self.dragState = d3.behavior.drag()
        .on("dragstart", function () {
            //stops drag bugs when wanted to click
            self.dragAmount = 0;
            d3.event.sourceEvent.stopPropagation();
        })
        .on("drag", function () {

            if (d3.event.sourceEvent.which == 1) {
                if (!self.preventStateDragging) {
                    self.dragAmount++;

                    var x = d3.event.x;
                    var y = d3.event.y;

                    if (self.snapping) {


                        var snapPointX = x - (x % self.gridSpace);
                        var snapPointY = y - (y % self.gridSpace);

                        //check first snapping Point (top left)
                        if (x > snapPointX - self.gridSnapDistance && x < snapPointX + self.gridSnapDistance && y > snapPointY - self.gridSnapDistance && y < snapPointY + self.gridSnapDistance) {
                            x = snapPointX;
                            y = snapPointY;
                            //second snapping point (top right)
                        } else if (x > snapPointX + self.gridSpace - self.gridSnapDistance && x < snapPointX + self.gridSpace + self.gridSnapDistance && y > snapPointY - self.gridSnapDistance && y < snapPointY + self.gridSnapDistance) {
                            x = snapPointX + self.gridSpace;
                            y = snapPointY;
                            //third snapping point (bot left)
                        } else if (x > snapPointX - self.gridSnapDistance && x < snapPointX + self.gridSnapDistance && y > snapPointY + self.gridSpace - self.gridSnapDistance && y < snapPointY + self.gridSpace + self.gridSnapDistance) {
                            x = snapPointX;
                            y = snapPointY + self.gridSpace;
                            //fourth snapping point (bot right)
                        } else if (x > snapPointX + self.gridSpace - self.gridSnapDistance && x < snapPointX + self.gridSpace + self.gridSnapDistance && y > snapPointY + self.gridSpace - self.gridSnapDistance && y < snapPointY + self.gridSpace + self.gridSnapDistance) {
                            x = snapPointX + self.gridSpace;
                            y = snapPointY + self.gridSpace;
                        }
                    }

                    //on drag isnt allowed workaround for bad drags when wanted to click
                    if (self.dragAmount > 1) {

                        //update the shown node
                        d3.select(this)
                            .attr("transform", "translate(" + x + " " + y + ")");
                        //update the node in the array

                        var stateId = d3.select(this).attr("object-id");
                        var tmpState = $scope.getStateById(stateId);
                        //update the state coordinates in the dataobject
                        tmpState.x = x;
                        tmpState.y = y;

                        //update the transitions after dragging a node
                        self.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"));
                    }
                }
            }

        }).on("dragend", function () {
            //save the movement
            if (self.dragAmount > 1) {
                $scope.safeApply();
            }
        });


    /**
     * gets the path for a selftransition
     * @param   {number} x
     * @param   {number} y 
     * @returns {String} path of the selftransition
     */
    self.selfTransition = function (x, y) {
        return self.bezierLine([
                [x - self.stateSelfReferenceNumber, y - self.stateSelfReferenceNumber],
                [x - self.stateSelfReferenceNumber - stretchX, y - self.stateSelfReferenceNumber - stretchY],
                [x - self.stateSelfReferenceNumber - stretchX, y + self.stateSelfReferenceNumber + stretchY],
                [x - self.stateSelfReferenceNumber, y + self.stateSelfReferenceNumber]
            ]);
    };

    /**
     * Crossproduct helper function
     * @param   {object}   a vector
     * @param   {object}   b vector
     * @returns {object}   crossproduct vetor 
     */
    function crossPro(a, b) {

        var vecC = {
            x: a.y * b.z,
            y: -a.x * b.z

        };
        return vecC;
    }

    function toDegrees(angle) {
        return angle * (180 / Math.PI);
    }

    function toRadians(angle) {
        return angle * (Math.PI / 180);
    }

    /**
     * expands a vector with a given factor
     * @param   {object} a      vector
     * @param   {number} factor expandfactor
     * @returns {object} expanded vector
     */
    function expandVector(a, factor) {
        return {
            x: a.x * factor,
            y: a.y * factor
        };
    }

    function fixVectorLength(a) {
        var tmp = 1 / Math.sqrt(a.x * a.x + a.y * a.y);
        return {
            x: a.x * tmp,
            y: a.y * tmp

        };
    }

    function AngleBetweenTwoVectors(a, b) {
        var tmp = (a.x * b.x + a.y * b.y) / (Math.sqrt(a.x * a.x + a.y * a.y) * Math.sqrt(b.x * b.x + b.y * b.y));
        var tmp2 = Math.acos(tmp);
        return {
            val: tmp,
            rad: tmp2,
            degree: toDegrees(tmp2)
        };
    }

    function newAngle(a, b) {
        var dot1 = a.x * b.x + a.y * b.y; //dot product
        var dot2 = a.x * b.y - a.y * b.x; //determinant
        return Math.atan2(dot2, dot1); //atan2(y, x) or atan2(sin, cos)
    }

    var degreeConstant = 30;

    function getAngles(a, b) {
        var angle = toDegrees(newAngle(a, b));
        if (angle < 0) {
            angle = angle + 360;
        }

        var upperAngle = angle + degreeConstant;
        if (upperAngle > 360) {
            upperAngle -= 360;
        }
        var lowerAngle = angle - degreeConstant;
        if (lowerAngle < 0) {
            lowerAngle += 360;
        }

        return {
            angle: angle,
            lowerAngle: lowerAngle,
            upperAngle: upperAngle
        };
    }

    //Get the Path from an array -> for the transition
    self.bezierLine = d3.svg.line()
        .x(function (d) {
            return d[0];
        })
        .y(function (d) {
            return d[1];
        })
        .interpolate("basis");

    /**
     * Returns the transitionDrawConfig with all the data like xstart, xend, xtext....
     * @param   {object}  transition    the transitionobj
     * @param   {boolean} forceApproach if we force an approachedtransition ->needed when the transition was writed to the array, or for the addtransition
     * @returns {object}  the drawConfig
     */
    self.getTransitionDrawConfig = function (transition, forceApproach) {
        //the distance the endPoint of the transition is away from the state
        var gapBetweenTransitionLineAndState = 3;
        var obj = {};

        /**1: Check if there is a transition aproach our transition**/
        obj.approachTransition = forceApproach || self.existsDrawnTransition(transition.toState, transition.fromState);

        /****2. Get the xStart,yStart and xEnd,yEnd  and xMid,yMid***/
        //from and to State
        var fromState = $scope.getStateById(transition.fromState);
        var toState = $scope.getStateById(transition.toState);
        var isToStateAFinalState = $scope.isStateAFinalState(transition.toState);
        //the x and y coordinates
        var x1 = fromState.x;
        var y1 = fromState.y;
        var x2 = toState.x;
        var y2 = toState.y;

        var xCurv1,
            yCurv1,
            xCurv2,
            yCurv2;

        //needed for the calculation of the coordinates
        var directionvector = {
            x: x2 - x1,
            y: y2 - y1
        };
        var directionVectorLength = Math.sqrt(directionvector.x * directionvector.x + directionvector.y * directionvector.y);
        var nStart = self.settings.stateRadius / directionVectorLength;
        var nEnd;
        if (isToStateAFinalState) {
            nEnd = (self.settings.stateRadius + gapBetweenTransitionLineAndState + 5) / directionVectorLength;
        } else {
            nEnd = (self.settings.stateRadius + gapBetweenTransitionLineAndState) / directionVectorLength;
        }

        obj.xStart = x1 + nStart * directionvector.x;
        obj.yStart = y1 + nStart * directionvector.y;

        obj.xEnd = x2 - nEnd * directionvector.x;
        obj.yEnd = y2 - nEnd * directionvector.y;
        obj.xDiff = x2 - x1;
        obj.yDiff = y2 - y1;
        obj.xMid = (x1 + x2) / 2;
        obj.yMid = (y1 + y2) / 2;
        obj.distance = Math.sqrt(obj.xDiff * obj.xDiff + obj.yDiff * obj.yDiff);
        /**3: Calc the CurvedPoint**/
        //BETTER ONLY CALC WHEN obj.approachTransition = true;
        var vecA = {
            x: obj.xMid - obj.xStart,
            y: obj.yMid - obj.yStart,
            z: 0
        };

        var vecB = {
            x: 0,
            y: 0,
            z: 1
        };


        var vecX = {
            x: 1,
            y: 0,
            z: 0
        };



        var stretchValue, movingPoint;
        //OLD:stretchValue = (70 * (1 / obj.distance * 1.1) * 1.4);
        stretchValue = 20;

        movingPoint = crossPro(vecA, vecB);
        movingPoint = fixVectorLength(movingPoint);

        movingPoint = expandVector(movingPoint, stretchValue);

        /**4:Calc the curvestart and end if there is and approach transition**/
        if (obj.approachTransition) {

            var xStart = getAngles({
                x: obj.xStart - x1,
                y: obj.yStart - y1
            }, {
                x: self.settings.stateRadius,
                y: 0
            });

            var xEnd = getAngles({
                x: obj.xEnd - x2,
                y: obj.yEnd - y2
            }, {
                x: self.settings.stateRadius,
                y: 0
            });

            obj.xStart = x1 + (self.settings.stateRadius * Math.cos(toRadians(xStart.upperAngle)));
            obj.yStart = y1 - (self.settings.stateRadius * Math.sin(toRadians(xStart.upperAngle)));

            obj.xEnd = x2 + (self.settings.stateRadius * Math.cos(toRadians(xEnd.lowerAngle)));
            obj.yEnd = y2 - (self.settings.stateRadius * Math.sin(toRadians(xEnd.lowerAngle)));
        }

        //OLD:stretchValue = (70 * (1 / obj.distance * 1.1) * 1.4);
        stretchValue = 35;

        movingPoint = crossPro(vecA, vecB);
        movingPoint = fixVectorLength(movingPoint);
        movingPoint = expandVector(movingPoint, stretchValue);
        obj.xMidCurv = movingPoint.x + obj.xMid;
        obj.yMidCurv = movingPoint.y + obj.yMid;


        /**5:Calc the textposition**/
        var existsDrawnTrans = self.existsDrawnTransition(fromState.id, toState.id);
        var drawnTrans = self.getDrawnTransition(fromState.id, toState.id);
        var transNamesLength;
        if (drawnTrans) {
            transNamesLength = drawnTrans.names.length;
        } else {
            transNamesLength = 1;
        }
        var angleAAndX = AngleBetweenTwoVectors(vecA, vecX);

        var textStretchValue, textPoint;
        var textAngle = angleAAndX.degree;
        if (textAngle > 90) {
            textAngle = 90 - (textAngle % 90);
        }
        var x = Math.pow((textAngle / 90), 1 / 2);

        if (obj.approachTransition) {
            textStretchValue = (40 + (8 * transNamesLength) * x);
        } else {
            textStretchValue = (12 + (transNamesLength * 8) * x);
        }


        textPoint = crossPro(vecA, vecB);
        textPoint = fixVectorLength(textPoint);
        textPoint = expandVector(textPoint, textStretchValue);

        obj.xText = textPoint.x + obj.xMid;
        obj.yText = textPoint.y + obj.yMid;


        /**6:Calc the path**/
        var array = [];
        if (obj.approachTransition) {
            array = [
                [obj.xStart, obj.yStart],
                [obj.xMidCurv, obj.yMidCurv],
                [obj.xEnd, obj.yEnd]
            ];
        } else {
            array = [
                [obj.xStart, obj.yStart],
                [obj.xEnd, obj.yEnd]
            ];
        }
        obj.path = self.bezierLine(array);
        return obj;
    };

    /**
     * Adds the transition names to the text of a transition
     * @param {object} textObj the transition textObjReference
     * @param {array}  names   the names array of the transition
     */
    self.writeTransitionText = function (textObj, names) {
        textObj.selectAll("*").remove();
        for (var i = 0; i < names.length; i++) {
            //fix when creating new transition when in animation
            if ($scope.simulator.animated.transition !== null && names[i].id === $scope.simulator.animated.transition.id) {
                textObj.append('tspan').attr('transition-id', names[i].id).text(names[i].name).classed("animated-transition-text", true);
            } else {
                textObj.append('tspan').attr('transition-id', names[i].id).text(names[i].name);
            }

            if (i < names.length - 1)
                textObj.append('tspan').text(' | ');
        }


    };

    /**
     * Draw a Transition
     * @param  {number} id 
     * @return {object}  Retruns the reference of the group object
     */
    self.drawTransition = function (transitionId) {
        var transition = $scope.getTransitionById(transitionId);
        //if there is not a transition with the same from and toState
        if (!self.existsDrawnTransition(transition.fromState, transition.toState)) {
            //the group element
            var group = self.svgTransitions.append("g")
                .attr("class", "transition"),
                //the line itself with the arrow
                lineSelection = group.append("path")
                .attr("class", "transition-line-selection")
                .attr("fill", "none")
                .attr("marker-end", "url(#marker-end-arrow-selection)"),
                line = group.append("path")
                .attr("class", "transition-line")
                .attr("fill", "none")
                .attr("marker-end", "url(#marker-end-arrow)"),

                lineClickArea = group.append("path")
                .attr("class", "transition-line-click")
                .attr("stroke-width", 20)
                .attr("stroke", "transparent")
                .attr("fill", "none"),
                lineHover = group.append("path")
                .attr("class", "transition-line-hover")
                .attr("fill", "none")
                .attr("marker-end", "url(#marker-end-arrow-hover)"),
                //the text of the transition
                text = group.append("text")
                .attr("class", "transition-text")
                .attr("dominant-baseline", "central")
                .attr("fill", "black");
            //if it is not a self Reference
            if (transition.fromState != transition.toState) {
                var drawConfig = self.getTransitionDrawConfig(transition);
                //if there is an approached transition update the approached transition
                if (drawConfig.approachTransition) {
                    //other transition in the other direction
                    var otherTrans = self.getDrawnTransition(transition.toState, transition.fromState);
                    var otherTransdrawConfig = self.getTransitionDrawConfig(otherTrans, true);
                    self.updateTransitionLines(otherTrans.objReference, otherTransdrawConfig.path);
                    //update the transition text position
                    otherTrans.objReference.select(".transition-text")
                        .attr("x", (otherTransdrawConfig.xText))
                        .attr("y", (otherTransdrawConfig.yText));
                }
                //draw the text
                text.attr("class", "transition-text")
                    .attr("x", (drawConfig.xText))
                    .attr("y", (drawConfig.yText));
                self.updateTransitionLines(group, drawConfig.path);

                //if it is a selfreference
            } else {
                var stateId = $scope.getArrayStateIdByStateId(transition.fromState);
                var x = $scope.config.states[stateId].x;
                var y = $scope.config.states[stateId].y;

                self.updateTransitionLines(group, self.selfTransition(x, y));
                text.attr("x", x - self.settings.stateRadius - 50)
                    .attr("y", y);
            }
            //add the drawnTransition
            group.attr("object-id", $scope.config.drawnTransitions.push({
                fromState: transition.fromState,
                toState: transition.toState,
                names: [{
                    "id": transition.id,
                    "name": transition.name
                }],
                objReference: group
            }) - 1);
            self.writeTransitionText(text, self.getDrawnTransition(transition.fromState, transition.toState).names);
            group.attr("from-state-id", transition.fromState)
                .attr("to-state-id", transition.toState)
                .on('click', self.openTransitionMenu)
                .on("mouseover", function () {
                    d3.select(this).select('.transition-line-hover').attr("style", "opacity:0.6");
                }).on("mouseleave", function () {
                    d3.select(this).select('.transition-line-hover').attr("style", "");
                });
            return group;
            //if there is already a transition with the same fromState and toState then the current
        } else {
            //add the name to the drawnTransition
            var drawnTransition = self.getDrawnTransition(transition.fromState, transition.toState);
            drawnTransition.names.push({
                "id": transition.id,
                "name": transition.name
            });
            //drawn the new name to the old transition (svg)
            self.writeTransitionText(drawnTransition.objReference.select('.transition-text'), self.getDrawnTransition(transition.fromState, transition.toState).names);
            var drawConfigNew = self.getTransitionDrawConfig(transition);
            drawnTransition.objReference.select('.transition-text')
                .attr("x", (drawConfigNew.xText))
                .attr("y", (drawConfigNew.yText));

        }
    };

    /**
     * helper function updates all the transition lines
     * @param {object}   transitionobjReference
     * @param {string}   path                   
     */
    self.updateTransitionLines = function (transitionobjReference, path) {
        transitionobjReference.select(".transition-line").attr("d", path);
        transitionobjReference.select(".transition-line-selection").attr("d", path);
        transitionobjReference.select(".transition-line-hover").attr("d", path);
        transitionobjReference.select(".transition-line-click").attr("d", path);
    };

    /**
     * opens the transitionmenu
     * @param {number} transitionId when there is a transitionId we open the transitionmenu with the given id
     */
    self.openTransitionMenu = function (transitionId) {
        self.closeStateMenu();
        self.closeTransitionMenu();
        self.preventSvgOuterClick = true;
        self.showTransitionMenu = true;

        var fromState, toState;
        if (transitionId === undefined) {
            fromState = d3.select(this).attr('from-state-id');
            toState = d3.select(this).attr('to-state-id');
            self.selectedTransition = self.getDrawnTransition(fromState, toState);
        } else {
            var tmpTransition = $scope.getTransitionById(transitionId);
            fromState = tmpTransition.fromState;
            toState = tmpTransition.toState;
            self.selectedTransition = self.getDrawnTransition(fromState, toState);
        }

        self.selectedTransition.objReference.classed("active", true);

        self.input = {};
        self.input.fromState = $scope.getStateById(fromState);
        self.input.toState = $scope.getStateById(toState);
        self.input.transitions = [];


        _.forEach(self.selectedTransition.names, function (value, key) {
            var tmpObject = {};
            tmpObject = cloneObject(value);

            if (transitionId !== undefined) {
                if (value.id == transitionId) {
                    tmpObject.isFocus = true;
                }
            } else if (self.selectedTransition.names.length - 1 === key) {
                tmpObject.isFocus = true;

            }
            //add other variables
            tmpObject.ttt = "";
            tmpObject.tttisopen = false;
            self.input.transitions.push(tmpObject);
        });

        self.transitionMenuListener = [];

        /*jshint -W083 */
        for (var i = 0; i < self.input.transitions.length; i++) {
            self.transitionMenuListener.push($scope.$watchCollection("statediagram.input.transitions['" + i + "']", function (newValue, oldValue) {
                if (newValue.name !== oldValue.name) {
                    newValue.tttisopen = false;
                    if (newValue.name !== "" && !$scope.existsTransition(fromState, toState, newValue.name)) {
                        $scope.renameTransition(newValue.id, newValue.name);
                    } else if (newValue.name === "") {
                        newValue.tttisopen = true;
                        newValue.ttt = 'TRANS_MENU.NAME_TOO_SHORT';
                    } else if ($scope.existsTransition(fromState, toState, newValue.name, newValue.id)) {
                        newValue.tttisopen = true;
                        newValue.ttt = 'TRANS_MENU.NAME_ALREAD_EXISTS';
                    }
                    console.log(($scope.existsTransition(fromState, toState, newValue.name, newValue.id)));
                }
            }));
        }


        $scope.safeApply();

    };

    /**
     * closes the transitionmenu
     */
    self.closeTransitionMenu = function () {
        _.forEach(self.transitionMenuListener, function (value, key) {
            value();
        });
        self.showTransitionMenu = false;
        if (self.selectedTransition !== null) {
            self.selectedTransition.objReference.classed("active", false);
            self.selectedTransition = null;

        }
    };

    /**
     * Update the transitions in the svg after moving a state
     * @param  {number} stateId Moved stateId
     */
    self.updateTransitionsAfterStateDrag = function (stateId) {
        var stateName = $scope.config.states[$scope.getArrayStateIdByStateId(stateId)].name;
        _.forEach($scope.config.drawnTransitions, function (n, key) {
            if (n.fromState == stateId || n.toState == stateId) {
                //if its not a selfreference
                var obj = n.objReference,
                    transitionText = obj.select("text");
                if (n.fromState != n.toState) {
                    var drawConfig = self.getTransitionDrawConfig(n);
                    //if there is a transition in the other direction
                    self.updateTransitionLines(obj, drawConfig.path);
                    transitionText.attr("x", drawConfig.xText).attr("y", drawConfig.yText);
                } else {
                    var moveStateId = n.fromState;
                    var x = $scope.config.states[$scope.getArrayStateIdByStateId(moveStateId)].x;
                    var y = $scope.config.states[$scope.getArrayStateIdByStateId(moveStateId)].y;
                    //update Transistion with self reference
                    self.updateTransitionLines(obj, self.selfTransition(x, y));
                    transitionText.attr("x", x - self.settings.stateRadius - 50).attr("y", y);
                }
            }
        });
    };

    /**************
     **SIMULATION**
     *************/


    $scope.$watch('simulator.animated.currentState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            console.log("CURRENTSTATE:oldValue " + oldValue + " newvalue " + newValue);
            console.log("status" + $scope.simulator.status);
            if (oldValue !== null) {
                self.setStateClassAs(oldValue, false, "animated-currentstate-svg");
                self.setStateClassAs(oldValue, false, "animated-accepted-svg");
                self.setStateClassAs(oldValue, false, "animated-not-accepted-svg");

            }
            if (newValue !== null) {
                if ($scope.simulator.status === "accepted") {
                    self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-accepted-svg");
                } else if ($scope.simulator.status === "not accepted") {
                    self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-not-accepted-svg");
                } else {
                    self.setStateClassAs(newValue, true, "animated-currentstate-svg");
                }
            }
        }
    });

    $scope.$watch('simulator.animated.transition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            if (oldValue !== null) {
                self.setTransitionClassAs(oldValue.id, false, "animated-transition");
                d3.selectAll("[transition-id='" + oldValue.id + "'").classed("animated-transition-text", false);
                //remove transitionname animation
            }
            if (newValue !== null) {
                self.setTransitionClassAs(newValue.id, true, "animated-transition");
                console.log(newValue);
                d3.selectAll("[transition-id='" + newValue.id + "'").classed("animated-transition-text", true);
                //animate transitionname
            }
        }
    });

    $scope.$watch('simulator.animated.nextState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            console.log("NEXTSTATE: oldValue " + oldValue + " newvalue " + newValue);
            if (oldValue !== null) {
                self.setStateClassAs(oldValue, false, "animated-nextstate-svg");
            }
            if (newValue !== null) {
                self.setStateClassAs(newValue, true, "animated-nextstate-svg");
            }
        }
    });
    $scope.$watch('simulator.status', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            if ($scope.simulator.status === "accepted") {
                self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-accepted-svg");
            } else if ($scope.simulator.status === "not accepted") {
                self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-not-accepted-svg");
            }
        }

    });
}
function StatetransitionfunctionDFA($scope) {
    "use strict";

    var self = this;
    self.functionData = {};
    self.functionData.states = [];
    self.functionData.startState = '';
    self.functionData.finalStates = '';
    self.functionData.transitions = '';
    self.functionData.statetransitionfunction = [];
    //ADD Listener
    $scope.updateListeners.push(self);


    self.updateFunction = function () {
        var arrayAlphabet = [];
        var stringAlphabet = '';
        var stringStates = '';
        var stringStateTransitions = '';
        var stringAllStateTransitions = '';
        var stringStartState = '';
        var startState;
        var stringFinalStates = '';
        var finalState;
        var i;

        self.functionData.transitions = $scope.config.alphabet;



        //Update of States
        self.functionData.states = [];
        _.forEach($scope.config.states, function (state, key) {
            stringStates = '';
            var selectedClass = '';
            if ($scope.statediagram.selectedState !== null && $scope.statediagram.selectedState.id == state.id) {
                selectedClass = "selected";
            }
            if (state.id == $scope.simulator.animated.currentState && $scope.simulator.status === "accepted") {
                stringStates += '<span class="animated-accepted ' + selectedClass + '">';
            } else if (state.id == $scope.simulator.animated.currentState && $scope.simulator.status === "not accepted") {
                stringStates += '<span class="animated-not-accepted ' + selectedClass + '">';
            } else if (state.id == $scope.simulator.animated.currentState) {
                stringStates += '<span class="animated-currentstate ' + selectedClass + '">';
            } else {
                stringStates += '<span class="' + selectedClass + '">';
            }

            stringStates += state.name;
            stringStates += '</span>';
            if (key < $scope.config.states.length - 1) {
                stringStates = stringStates + ', ';
            }
            self.functionData.states.push(stringStates);
        });



        //Update of statetransitionfunction
        self.functionData.statetransitionfunction = [];
        //we go through every state and check if there is a transition and then we save them in the statetransitionfunction array
        _.forEach($scope.config.states, function (state, keyOuter) {
            _.forEach($scope.config.transitions, function (transition, key) {

                if (transition.fromState === state.id) {
                    var stateTransition = transition;
                    var selectedTransition = false;
                    if ($scope.statediagram.selectedTransition !== null && _.find($scope.statediagram.selectedTransition.names, {
                            id: transition.id
                        }) !== undefined) {
                        selectedTransition = true;
                    }
                    var animatedCurrentState = false;
                    if ($scope.simulator.animated.transition && $scope.simulator.animated.transition.id === stateTransition.id) {
                        animatedCurrentState = true;
                    }
                    if (animatedCurrentState || selectedTransition) {
                        stringStateTransitions = '(<span class=" ' + (animatedCurrentState ? 'animated-transition' : '') + ' ' + (selectedTransition ? 'selected' : '') + '">';
                    } else {
                        stringStateTransitions = '(<span>';
                    }
                    stringStateTransitions += $scope.getStateById(stateTransition.fromState).name + ', ';
                    stringStateTransitions += stateTransition.name + ', ';
                    stringStateTransitions += $scope.getStateById(stateTransition.toState).name + '</span>)';

                    self.functionData.statetransitionfunction.push(stringStateTransitions);
                }
            });
        });


        //Update of Startstate
        startState = $scope.getStateById($scope.config.startState);
        if (startState !== undefined) {
            stringStartState += '<span class="">' + startState.name + '</span>';
        }

        self.functionData.startState = stringStartState;

        //Update of Finalstates
        _.forEach($scope.config.finalStates, function (finalState, key) {
            finalState = $scope.getStateById(finalState);
            stringFinalStates = finalState.name;
            if (key < $scope.config.finalStates.length - 1) {
                stringFinalStates += ', ';
            }
        });

        self.functionData.finalStates = stringFinalStates;

    };


    /**************
     **SIMULATION**
     *************/

    $scope.$watch('simulator.animated.currentState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('simulator.animated.transition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedTransition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });
    $scope.$watch('simulator.status', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });
}
//TableDFA
function TableDFA($scope) {
    var self = this;
    self.states = [];
    $scope.updateListeners.push(self);


    self.updateFunction = function () {
        self.states = [];
        self.alphabet = [];
        var dfa = $scope.config;



        var alphabetCounter;

        //prepare alphabet
        _.forEach($scope.config.alphabet, function (character, key) {
            var selectedTrans = "";
            if ($scope.statediagram.selectedTransition !== null && _.find($scope.statediagram.selectedTransition.names, {
                    name: character
                }) !== undefined) {
                selectedTrans = "selected";
            }

            var tmp;
            if ($scope.simulator.animated.transition && $scope.simulator.animated.transition.name === character) {
                tmp = '<span class="animated-transition ' + selectedTrans + '">' + character + '</span>';
            } else {
                tmp = '<span class="' + selectedTrans + '">' + character + '</span>';
            }
            self.alphabet.push(tmp);
        });

        // iterates over all States
        _.forEach($scope.config.states, function (state, key) {


            var tmpObject = {};
            tmpObject.id = state.id;
            // marks the current active state at the simulation in the table
            var selectedClass = "";
            if (($scope.statediagram.selectedState !== null && $scope.statediagram.selectedState.id == state.id) || ($scope.statediagram.selectedTransition !== null && $scope.statediagram.selectedTransition.fromState === state.id)) {
                selectedClass = "selected";
            }
            if ($scope.simulator.animated.currentState == state.id) {
                var animatedClass = "";
                if ($scope.simulator.status === "accepted") {
                    animatedClass = "animated-accepted";
                } else if ($scope.simulator.status === "not accepted") {
                    animatedClass = "animated-not-accepted";
                } else {
                    animatedClass = "animated-currentstate";
                }

                tmpObject.name = '<span class="' + animatedClass + ' ' + selectedClass + '">' + state.name + '</span>';
            } else {
                tmpObject.name = '<span class="' + selectedClass + '">' + state.name + '</span>';
            }

            if ($scope.isStateAFinalState(state.id))
                tmpObject.finalState = true;
            else
                tmpObject.finalState = false;

            if ($scope.config.startState === state.id)
                tmpObject.startState = true;
            else
                tmpObject.startState = false;

            tmpObject.trans = [];


            // iterates over all aplphabet 
            _.forEach($scope.config.alphabet, function (character, key) {
                var foundTransition = null;

                // iterates over the available transitions and saves found transitions
                _.forEach($scope.config.transitions, function (transition, key) {
                    if (transition.fromState === state.id && transition.name === character) {
                        foundTransition = transition;
                    }
                });

                var trans = {};
                trans.alphabet = character;

                // saves the found Transition in "Trans.State"
                if (foundTransition !== null) {
                    var tmpToState = $scope.getStateById(foundTransition.toState);
                    var selectedTrans = "";
                    if ($scope.statediagram.selectedTransition !== null && $scope.statediagram.selectedTransition.toState === tmpToState.id) {
                        selectedTrans = "selected";
                    }
                    if ($scope.simulator.animated.nextState == tmpToState.id && foundTransition.name == $scope.simulator.animated.transition.name) {
                        trans.State = '<span class="animated-nextstate ' + selectedTrans + '">' + tmpToState.name + '</span>';
                    } else {
                        trans.State = '<span class="' + selectedTrans + '">' + tmpToState.name + '</span>';
                    }
                } else {
                    trans.State = "";
                }

                tmpObject.trans.push(trans);
            });
            self.states.push(tmpObject);

        });

    };


    /**************
     **SIMULATION**
     *************/

    $scope.$watch('simulator.animated.currentState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('simulator.animated.transition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });
    $scope.$watch('simulator.animated.nextState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedTransition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

}
function DFA(t,e){"use strict";window.debugScope=t,t.defaultConfig={},t.defaultConfig.statePrefix="S",t.defaultConfig.transitionNameSuffix="|",t.defaultConfig.diagramm={x:0,y:0,scale:1,updatedWithZoomBehavior:!1},t.defaultConfig.countStateId=0,t.defaultConfig.countTransitionId=0,t.defaultConfig.states=[],t.defaultConfig.startState=null,t.defaultConfig.finalStates=[],t.defaultConfig.transitions=[],t.defaultConfig.alphabet=[],t.defaultConfig.inputWord="",t.defaultConfig.name="Untitled Automaton",t.defaultConfig.unSavedChanges=!1,t.defaultConfig.drawnTransitions=[],t.config=cloneObject(t.defaultConfig),t.updateListeners=[],t.simulator=new SimulationDFA(t),t.table=new TableDFA(t),t.statediagram=new StateDiagramDFA(t,"#diagramm-svg"),t.statetransitionfunction=new StatetransitionfunctionDFA(t),t.testData=new TestData(t),t.inNameEdit=!1,t.showModalWithMessage=function(e,a,n,i){t.title=e,t.description=a,t.modalAction=n,void 0===i?t.button="MODAL_BUTTON.PROCEED":t.button=i,$("#modal").modal()},t.executeModalAction=function(){t.$eval(t.modalAction)},t.stepTimeOutSlider={options:{floor:0,step:100,ceil:3e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.loopTimeOutSlider={options:{floor:0,step:100,ceil:4e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.keypressCallback=function(t){13==t.charCode&&document.getElementById("automatonNameEdit").blur()},window.onbeforeunload=function(e){if(t.config.unSavedChanges){var a="All Changes will be Lost. Save before continue!";return"undefined"==typeof e&&(e=window.event),e&&(e.returnValue=a),a}},t.saveAutomaton=function(){t.config.unSavedChanges=!1},t.safeApply=function(t){var e=this.$root.$$phase;"$apply"==e||"$digest"==e?t&&"function"==typeof t&&t():this.$apply(t)},t.resetAutomaton=function(){t.statediagram.clearSvgContent(),t.simulator.reset(),t.config=cloneObject(t.defaultConfig),t.safeApply(),t.updateListener()},t.addToAlphabet=function(e){_.some(t.config.alphabet,function(t){return t===e})||t.config.alphabet.push(e)},t.removeFromAlphabetIfNotUsedFromOthers=function(e){for(var a=t.getTransitionById(e),n=!1,i=0;i<t.config.transitions.length;i++)if(a.name===t.config.transitions[i].name&&t.config.transitions[i].id!==e)return void(n=!0);return n?!1:(_.pull(t.config.alphabet,a.name),!0)},t.updateListener=function(){_.forEach(t.updateListeners,function(t,e){t.updateFunction()}),t.config.unSavedChanges=!0},t.existsStateWithName=function(e,a){var n=!1;return _.forEach(t.config.states,function(t){return t.name==e&&t.id!==a?void(n=!0):void 0}),n},t.existsStateWithId=function(e){for(var a=0;a<t.config.states.length;a++)if(t.config.states[a].id==e)return!0;return!1},t.hasStateTransitions=function(e){var a=!1;return _.forEach(t.config.transitions,function(t){t.fromState!=e&&t.toState!=e||(a=!0)}),a},t.getArrayStateIdByStateId=function(e){return _.findIndex(t.config.states,function(t){return t.id==e?t:void 0})},t.getStateById=function(e){return t.config.states[t.getArrayStateIdByStateId(e)]},t.getStateByName=function(e){return t.config.states[t.getArrayStateIdByStateId(function(t){})]},t.addStateWithPresets=function(e,a){var n=t.addState(t.config.statePrefix+t.config.countStateId,e,a);return 1==t.config.countStateId&&t.changeStartState(0),n},t.addState=function(e,a,n){return t.existsStateWithName(e)?null:t.addStateWithId(t.config.countStateId++,e,a,n)},t.addStateWithId=function(e,a,n,i){t.config.states.push(new State(e,a,n,i));return t.statediagram.drawState(e),t.updateListener(),t.safeApply(),t.getStateById(e)},t.removeState=function(e){t.hasStateTransitions(e)?t.showModalWithMessage("STATE_MENU.DELETE_MODAL_TITLE","STATE_MENU.DELETE_MODAL_DESC","forcedRemoveState("+e+")","MODAL_BUTTON.DELETE"):(t.isStateAFinalState(e)&&t.removeFinalState(e),t.config.startState==e&&(t.config.startState=null),t.statediagram.removeState(e),t.config.states.splice(t.getArrayStateIdByStateId(e),1),t.updateListener())},t.forcedRemoveState=function(e){for(var a=0;a<t.config.transitions.length;a++){var n=t.config.transitions[a];n.fromState!==e&&n.toState!==e||(t.removeTransition(n.id),a--)}t.removeState(e)},t.renameState=function(e,a){return t.existsStateWithName(a)?!1:(t.getStateById(e).name=a,t.statediagram.renameState(e,a),t.updateListener(),!0)},t.changeStartState=function(e){t.existsStateWithId(e)&&(t.statediagram.changeStartState(e),t.config.startState=e,t.updateListener())},t.removeStartState=function(){null!==t.config.startState&&(t.statediagram.removeStartState(),t.updateListener(),t.config.startState=null)},t.getFinalStateIndexByStateId=function(e){return _.indexOf(t.config.finalStates,e)},t.isStateAFinalState=function(e){for(var a=0;a<t.config.finalStates.length;a++)if(t.config.finalStates[a]==e)return!0;return!1},t.addFinalState=function(e){t.isStateAFinalState(e)||(t.config.finalStates.push(e),t.statediagram.addFinalState(e),t.updateListener())},t.removeFinalState=function(e){t.isStateAFinalState(e)&&(t.statediagram.removeFinalState(e),t.updateListener(),t.config.finalStates.splice(t.getFinalStateIndexByStateId(e),1))},t.existsTransition=function(e,a,n,i){for(var r=!1,s=0;s<t.config.transitions.length;s++){var o=t.config.transitions[s];o.fromState==e&&o.name==n&&o.id!==i&&(r=!0)}return r},t.getNextTransitionName=function(e){for(var a=[],n=0;n<t.config.transitions.length;n++)t.config.transitions[n].fromState==e&&a.push(t.config.transitions[n].name);for(var i=!1,r="a";!i;){var s=_.indexOf(a,r);-1===s?i=!0:r=String.fromCharCode(r.charCodeAt()+1)}return r},t.addTransition=function(e,a,n){return!t.existsTransition(e,a,n)&&t.existsStateWithId(e)&&t.existsStateWithId(a)?(t.addToAlphabet(n),t.addTransitionWithId(t.config.countTransitionId++,e,a,n)):void 0},t.addTransitionWithId=function(e,a,n,i){return t.config.transitions.push(new TransitionDFA(e,a,n,i)),t.statediagram.drawTransition(e),t.updateListener(),t.safeApply(),t.getTransitionById(e)},t.getArrayTransitionIdByTransitionId=function(e){return _.findIndex(t.config.transitions,function(t){return t.id==e?t:void 0})},t.getTransitionById=function(e){return t.config.transitions[t.getArrayTransitionIdByTransitionId(e)]},t.getTransition=function(e,a,n){for(var i=0;i<t.config.transitions.length;i++){var r=t.config.transitions[i];if(r.fromState==e&&r.toState==a&&r.name==n)return r}},t.removeTransition=function(e){t.removeFromAlphabetIfNotUsedFromOthers(e),t.statediagram.removeTransition(e),t.config.transitions.splice(t.getArrayTransitionIdByTransitionId(e),1),t.updateListener()},t.renameTransition=function(e,a){var n=t.getTransitionById(e);if(t.existsTransition(n.fromState,n.toState,a))return!1;t.getTransitionById(e);return t.removeFromAlphabetIfNotUsedFromOthers(e),t.addToAlphabet(a),t.getTransitionById(e).name=a,t.statediagram.renameTransition(n.fromState,n.toState,e,a),t.updateListener(),!0}}function DFA(t,e){"use strict";window.debugScope=t,t.defaultConfig={},t.defaultConfig.statePrefix="S",t.defaultConfig.transitionNameSuffix="|",t.defaultConfig.diagramm={x:0,y:0,scale:1,updatedWithZoomBehavior:!1},t.defaultConfig.countStateId=0,t.defaultConfig.countTransitionId=0,t.defaultConfig.states=[],t.defaultConfig.startState=null,t.defaultConfig.finalStates=[],t.defaultConfig.transitions=[],t.defaultConfig.alphabet=[],t.defaultConfig.inputWord="",t.defaultConfig.name="Untitled Automaton",t.defaultConfig.unSavedChanges=!1,t.defaultConfig.drawnTransitions=[],t.config=cloneObject(t.defaultConfig),t.updateListeners=[],t.simulator=new SimulationDFA(t),t.table=new TableDFA(t),t.statediagram=new StateDiagramDFA(t,"#diagramm-svg"),t.statetransitionfunction=new StatetransitionfunctionDFA(t),t.testData=new TestData(t),t.inNameEdit=!1,t.showModalWithMessage=function(e,a,n,i){t.title=e,t.description=a,t.modalAction=n,void 0===i?t.button="MODAL_BUTTON.PROCEED":t.button=i,$("#modal").modal()},t.executeModalAction=function(){t.$eval(t.modalAction)},t.stepTimeOutSlider={options:{floor:0,step:100,ceil:3e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.loopTimeOutSlider={options:{floor:0,step:100,ceil:4e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.keypressCallback=function(t){13==t.charCode&&document.getElementById("automatonNameEdit").blur()},window.onbeforeunload=function(e){if(t.config.unSavedChanges){var a="All Changes will be Lost. Save before continue!";return"undefined"==typeof e&&(e=window.event),e&&(e.returnValue=a),a}},t.saveAutomaton=function(){t.config.unSavedChanges=!1},t.safeApply=function(t){var e=this.$root.$$phase;"$apply"==e||"$digest"==e?t&&"function"==typeof t&&t():this.$apply(t)},t.resetAutomaton=function(){t.statediagram.clearSvgContent(),t.simulator.reset(),t.config=cloneObject(t.defaultConfig),t.safeApply(),t.updateListener()},t.addToAlphabet=function(e){_.some(t.config.alphabet,function(t){return t===e})||t.config.alphabet.push(e)},t.removeFromAlphabetIfNotUsedFromOthers=function(e){for(var a=t.getTransitionById(e),n=!1,i=0;i<t.config.transitions.length;i++)if(a.name===t.config.transitions[i].name&&t.config.transitions[i].id!==e)return void(n=!0);return n?!1:(_.pull(t.config.alphabet,a.name),!0)},t.updateListener=function(){_.forEach(t.updateListeners,function(t,e){t.updateFunction()}),t.config.unSavedChanges=!0},t.existsStateWithName=function(e,a){var n=!1;return _.forEach(t.config.states,function(t){return t.name==e&&t.id!==a?void(n=!0):void 0}),n},t.existsStateWithId=function(e){for(var a=0;a<t.config.states.length;a++)if(t.config.states[a].id==e)return!0;return!1},t.hasStateTransitions=function(e){var a=!1;return _.forEach(t.config.transitions,function(t){t.fromState!=e&&t.toState!=e||(a=!0)}),a},t.getArrayStateIdByStateId=function(e){return _.findIndex(t.config.states,function(t){return t.id==e?t:void 0})},t.getStateById=function(e){return t.config.states[t.getArrayStateIdByStateId(e)]},t.getStateByName=function(e){return t.config.states[t.getArrayStateIdByStateId(function(t){})]},t.addStateWithPresets=function(e,a){var n=t.addState(t.config.statePrefix+t.config.countStateId,e,a);return 1==t.config.countStateId&&t.changeStartState(0),n},t.addState=function(e,a,n){return t.existsStateWithName(e)?null:t.addStateWithId(t.config.countStateId++,e,a,n)},t.addStateWithId=function(e,a,n,i){t.config.states.push(new State(e,a,n,i));return t.statediagram.drawState(e),t.updateListener(),t.safeApply(),t.getStateById(e)},t.removeState=function(e){t.hasStateTransitions(e)?t.showModalWithMessage("STATE_MENU.DELETE_MODAL_TITLE","STATE_MENU.DELETE_MODAL_DESC","forcedRemoveState("+e+")","MODAL_BUTTON.DELETE"):(t.isStateAFinalState(e)&&t.removeFinalState(e),t.config.startState==e&&(t.config.startState=null),t.statediagram.removeState(e),t.config.states.splice(t.getArrayStateIdByStateId(e),1),t.updateListener())},t.forcedRemoveState=function(e){for(var a=0;a<t.config.transitions.length;a++){var n=t.config.transitions[a];n.fromState!==e&&n.toState!==e||(t.removeTransition(n.id),a--)}t.removeState(e)},t.renameState=function(e,a){return t.existsStateWithName(a)?!1:(t.getStateById(e).name=a,t.statediagram.renameState(e,a),t.updateListener(),!0)},t.changeStartState=function(e){t.existsStateWithId(e)&&(t.statediagram.changeStartState(e),t.config.startState=e,t.updateListener())},t.removeStartState=function(){null!==t.config.startState&&(t.statediagram.removeStartState(),t.updateListener(),t.config.startState=null)},t.getFinalStateIndexByStateId=function(e){return _.indexOf(t.config.finalStates,e)},t.isStateAFinalState=function(e){for(var a=0;a<t.config.finalStates.length;a++)if(t.config.finalStates[a]==e)return!0;return!1},t.addFinalState=function(e){t.isStateAFinalState(e)||(t.config.finalStates.push(e),t.statediagram.addFinalState(e),t.updateListener())},t.removeFinalState=function(e){t.isStateAFinalState(e)&&(t.statediagram.removeFinalState(e),t.updateListener(),t.config.finalStates.splice(t.getFinalStateIndexByStateId(e),1))},t.existsTransition=function(e,a,n,i){for(var r=!1,s=0;s<t.config.transitions.length;s++){var o=t.config.transitions[s];o.fromState==e&&o.name==n&&o.id!==i&&(r=!0)}return r},t.getNextTransitionName=function(e){for(var a=[],n=0;n<t.config.transitions.length;n++)t.config.transitions[n].fromState==e&&a.push(t.config.transitions[n].name);for(var i=!1,r="a";!i;){var s=_.indexOf(a,r);-1===s?i=!0:r=String.fromCharCode(r.charCodeAt()+1)}return r},t.addTransition=function(e,a,n){return!t.existsTransition(e,a,n)&&t.existsStateWithId(e)&&t.existsStateWithId(a)?(t.addToAlphabet(n),t.addTransitionWithId(t.config.countTransitionId++,e,a,n)):void 0},t.addTransitionWithId=function(e,a,n,i){return t.config.transitions.push(new TransitionDFA(e,a,n,i)),t.statediagram.drawTransition(e),t.updateListener(),t.safeApply(),t.getTransitionById(e)},t.getArrayTransitionIdByTransitionId=function(e){return _.findIndex(t.config.transitions,function(t){return t.id==e?t:void 0})},t.getTransitionById=function(e){return t.config.transitions[t.getArrayTransitionIdByTransitionId(e)]},t.getTransition=function(e,a,n){for(var i=0;i<t.config.transitions.length;i++){var r=t.config.transitions[i];if(r.fromState==e&&r.toState==a&&r.name==n)return r}},t.removeTransition=function(e){t.removeFromAlphabetIfNotUsedFromOthers(e),t.statediagram.removeTransition(e),t.config.transitions.splice(t.getArrayTransitionIdByTransitionId(e),1),t.updateListener()},t.renameTransition=function(e,a){var n=t.getTransitionById(e);if(t.existsTransition(n.fromState,n.toState,a))return!1;t.getTransitionById(e);return t.removeFromAlphabetIfNotUsedFromOthers(e),t.addToAlphabet(a),t.getTransitionById(e).name=a,t.statediagram.renameTransition(n.fromState,n.toState,e,a),t.updateListener(),!0}}function SimulationDFA(t){"use strict";var e=this;e.isInPlay=!1,e.loopSimulation=!0,e.stepTimeOut=1500,e.loopTimeOut=2e3,e.simulationPaused=!1,e.simulationSettings=!0,e.currentState=null,e.nextState=null,e.transition=null,e.isInputAccepted=!1,e.settings=function(){e.simulationSettings=!e.simulationSettings},e.animated={currentState:null,transition:null,nextState:null},e.reset=function(){e.animated={currentState:null,transition:null,nextState:null},e.goneTransitions=[],e.currentState=t.config.startState,e.transition=null,e.animatedTransition=!1,e.nextState=null,e.animatedNextState=!1,e.isNextStepCalculated=!1,e.simulationStarted=!1,e.statusSequence=[t.config.startState],e.madeSteps=0,e.inputWord=t.config.inputWord,e.processedWord="",e.nextChar="",e.status="stopped"},e.pause=function(){e.simulationPaused||(e.simulationPaused=!0,e.isInPlay=!1)},e.stop=function(){e.pause(),e.reset()},e.play=function(){e.simulationPaused||(e.simulationStarted?((e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&(e.animateNextMove(),t.safeApply(function(){}),(e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&setTimeout(e.play,e.stepTimeOut)),e.isNextStepCalculated||"accepted"!=e.status||(e.loopSimulation?setTimeout(e.play,e.loopTimeOut):e.isInPlay=!1,e.simulationStarted=!1,t.safeApply(function(){}))):e.prepareSimulation())},e.prepareSimulation=function(){e.reset(),e.simulationStarted=!0,e.animated.currentState=_.last(e.statusSequence),t.safeApply(),setTimeout(e.play,e.loopTimeOut)},e.animateNextMove=function(){e.isNextStepCalculated||e.calcNextStep(),e.animatedTransition?!e.animatedNextState&&e.animatedTransition?(e.animatedNextState=!0,e.animated.nextState=e.nextState):e.animatedTransition&&e.animatedNextState&&(e.animated.transition=null,e.animated.nextState=null,e.animated.currentState=e.nextState,e.currentState=e.nextState,e.madeSteps++,e.inputWord.length==e.madeSteps&&(_.include(t.config.finalStates,e.currentState)?e.status="accepted":e.status="not accepted"),e.isNextStepCalculated=!1,e.animatedNextState=!1,e.animatedTransition=!1,e.processedWord+=e.nextChar,e.statusSequence.push(e.currentState),"accepted"!==e.status&&"not accepted"!==e.status&&e.calcNextStep()):(e.animatedTransition=!0,e.animated.transition=e.transition,e.goneTransitions.push(e.transition))},e.calcNextStep=function(){return e.isNextStepCalculated=!0,e.status="step",e.nextChar=e.inputWord[e.madeSteps],e.transition=_.filter(t.config.transitions,function(t){return void 0===e.nextChar?void(e.status="not accepted"):t.fromState==_.last(e.statusSequence)&&t.name==e.nextChar}),_.isEmpty(e.transition)?(e.transition=null,void(e.status="not accepted")):(e.transition=e.transition[0],void(e.nextState=e.transition.toState))},e.stepForward=function(){if(e.simulationPaused||e.pause(),e.simulationStarted){if(!_.include(["step","stopped","accepted","not accepted"],e.status))return void console.log(e.status);_.include(["accepted","not accepted"],e.status)||e.animateNextMove()}else e.prepareSimulation(),e.status="step"},e.stepBackward=function(){e.simulationPaused||e.pause(),_.include(["step","accepted","not accepted"],e.status)&&(e.status="step",e.animatedTransition||e.animatedNextState||0!==e.madeSteps?e.animateLastMove():e.reset())},e.animateLastMove=function(){console.log(e.animatedTransition+" "+e.animatedNextState),e.animatedTransition&&e.animatedNextState?(e.animated.nextState=null,e.animatedNextState=!1):e.animatedTransition?(e.animated.transition=null,e.animatedTransition=!1,e.goneTransitions.pop()):e.calcLastStep()},e.calcLastStep=function(){e.nextChar=e.processedWord.slice(-1),console.log(e.nextChar+" "+e.statusSequence[e.statusSequence.length-2]),e.transition=_.last(e.goneTransitions),console.log(e.transition),_.pullAt(e.goneTransitions,e.goneTransitions.length),e.animatedTransition=!0,e.animated.transition=e.transition;var t=e.currentState;e.currentState=e.transition.fromState,e.nextState=t,e.animated.nextState=e.nextState,e.animatedNextState=!0,e.animated.currentState=e.currentState,e.madeSteps--,e.statusSequence.splice(-1,1),e.processedWord=e.processedWord.slice(0,-1)},e.getNextTransition=function(e,a){for(var n=0;n<t.config.transitions.length;n++){var i=t.config.transitions[n];if(i.fromState==e&&i.name==a)return i}},e.check=function(){var a=!1,n=[];n.push(t.config.startState);for(var i="",r=0,s=null;r<=t.config.inputWord.length&&(i=t.config.inputWord[r],s=e.getNextTransition(_.last(n),i),!_.isEmpty(s));)if(n.push(s.toState),r++,t.config.inputWord.length==r){if(_.include(t.config.finalStates,_.last(n))){a=!0;break}break}return a},e.isPlayable=function(){return t.config.states.length>=1&&t.config.transitions.length>=1&&null!==t.config.startState&&t.config.finalStates.length>=1},e.playOrPause=function(){e.isPlayable()&&(e.isInPlay=!e.isInPlay,e.isInPlay?(e.simulationPaused=!1,e.play()):e.pause())},t.updateListeners.push(e),e.updateFunction=function(){e.isInputAccepted=e.check()}}function StateDiagramDFA(t,e){"use strict";function a(t,e){var a={x:t.y*e.z,y:-t.x*e.z};return a}function n(t){return t*(180/Math.PI)}function i(t){return t*(Math.PI/180)}function r(t,e){return{x:t.x*e,y:t.y*e}}function s(t){var e=1/Math.sqrt(t.x*t.x+t.y*t.y);return{x:t.x*e,y:t.y*e}}function o(t,e){var a=(t.x*e.x+t.y*e.y)/(Math.sqrt(t.x*t.x+t.y*t.y)*Math.sqrt(e.x*e.x+e.y*e.y)),i=Math.acos(a);return{val:a,rad:i,degree:n(i)}}function c(t,e){var a=t.x*e.x+t.y*e.y,n=t.x*e.y-t.y*e.x;return Math.atan2(n,a)}function d(t,e){var a=n(c(t,e));0>a&&(a+=360);var i=a+g;i>360&&(i-=360);var r=a-g;return 0>r&&(r+=360),{angle:a,lowerAngle:r,upperAngle:i}}var l=this;l.preventStateDragging=!1,l.inAddTransition=!1,l.selectedState=null,l.preventSvgOuterClick=!1,l.selectedTransition=null,l.showStateMenu=!1,l.showTransitionMenu=!1,l.selectedStateName="selectedForTransition",l.snapping=!0,l.settings={stateRadius:25,finalStateRadius:29,selected:!1};var u=40,f=18;l.stateSelfReferenceNumber=Math.sin(45*(Math.PI/180))*l.settings.stateRadius,l.existsDrawnTransition=function(e,a){for(var n=!1,i=0;i<t.config.drawnTransitions.length;i++){var r=t.config.drawnTransitions[i];r.fromState==e&&r.toState==a&&(n=!0)}return n},l.getDrawnTransition=function(e,a){for(var n=0;n<t.config.drawnTransitions.length;n++){var i=t.config.drawnTransitions[n];if(i.fromState==e&&i.toState==a)return i}},l.clearSvgContent=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgTransitions.html(""),l.svgStates.html(""),t.config.drawnTransitions=[],l.svg.attr("transform","translate("+t.defaultConfig.diagramm.x+","+t.defaultConfig.diagramm.y+") scale("+t.defaultConfig.diagramm.scale+")"),m.scale(t.defaultConfig.diagramm.scale),m.translate([t.defaultConfig.diagramm.x,t.defaultConfig.diagramm.y])},l.zoomMax=2.5,l.zoomMin=.5,l.zoomValue=.1,l.zoomIn=function(){t.config.diagramm.scale=t.config.diagramm.scale+l.zoomValue>l.zoomMax?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale+l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomOut=function(){t.config.diagramm.scale=t.config.diagramm.scale-l.zoomValue<=l.zoomMin?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale-l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomTo=function(e){console.log("zoomtedto"),t.config.diagramm.scale=e/100,t.safeApply(),l.updateZoomBehaviour()},l.updateZoomBehaviour=function(){t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")"),m.scale(t.config.diagramm.scale),m.translate([t.config.diagramm.x,t.config.diagramm.y])},l.zoomFitWindow=function(){var e,a=[],n=[],i=0,r=0,s=0,o=0,c=0,d=0,u=l.svgOuter.style("width").replace("px",""),f=l.svgOuter.style("height").replace("px","");if(t.config.diagramm.scale=1,t.config.states.length>0){for(e=0;e<t.config.states.length;e++)a[e]=t.config.states[e].x;for(e=0;e<t.config.states.length;e++)n[e]=t.config.states[e].y;for(i=_.min(a),r=_.max(a),s=_.min(n),o=_.max(n);r-i+150>u/t.config.diagramm.scale||o-s+200>f/t.config.diagramm.scale;)t.config.diagramm.scale-=.01;t.safeApply(),c=(f/t.config.diagramm.scale-(o-s))/2,d=(u/t.config.diagramm.scale-(r-i))/2,t.config.diagramm.x=-(i*t.config.diagramm.scale)+d*t.config.diagramm.scale,t.config.diagramm.y=-(s*t.config.diagramm.scale)+c*t.config.diagramm.scale,l.updateZoomBehaviour()}else l.scaleAndTranslateToDefault()},l.scaleAndTranslateToDefault=function(){t.config.diagramm.scale=t.defaultConfig.diagramm.scale,t.config.diagramm.x=t.defaultConfig.diagramm.x,t.config.diagramm.y=t.defaultConfig.diagramm.y,t.safeApply(),l.updateZoomBehaviour()};var m=d3.behavior.zoom().scaleExtent([l.zoomMin,l.zoomMax]).on("zoom",function(){var e=d3.event.button||d3.event.ctrlKey;if(e&&d3.event.stopImmediatePropagation(),3!==d3.event.sourceEvent.which){var a=Math.floor(100*d3.event.scale)/100;t.config.diagramm.scale=a,t.config.diagramm.x=d3.event.translate[0],t.config.diagramm.y=d3.event.translate[1],t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")")}else console.log("rightclick!")});l.svgOuter=d3.select(e).call(m).on("dblclick.zoom",null).on("contextmenu",function(){d3.event.preventDefault()}),l.addSvgOuterClickListener=function(){l.svgOuter.on("click",function(){l.preventSvgOuterClick?l.preventSvgOuterClick=!1:(l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply())})},l.addSvgOuterClickListener(),l.svgGrid=l.svgOuter.append("g").attr("id","grid"),l.svg=l.svgOuter.append("g").attr("id","svg-items"),l.svgTransitions=l.svg.append("g").attr("id","transitions"),l.svgStates=l.svg.append("g").attr("id","states"),l.gridSpace=100,l.gridSnapDistance=20,l.isGrid=!0,t.$watch("[statediagram.isGrid , config.diagramm]",function(){l.drawGrid()},!0),l.drawGrid=function(){if(l.isGrid){l.svgGrid.html("");var e,a=l.svgOuter.style("width").replace("px",""),n=l.svgOuter.style("height").replace("px",""),i=1*t.config.diagramm.scale*.5,r=t.config.diagramm.x%(l.gridSpace*t.config.diagramm.scale),s=t.config.diagramm.y%(l.gridSpace*t.config.diagramm.scale);for(e=r;a>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line xgrid-line").attr("x1",e).attr("y1",0).attr("x2",e).attr("y2",n);for(e=s;n>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line ygrid-line").attr("x1",0).attr("y1",e).attr("x2",a).attr("y2",e)}else l.svgGrid.html("")},l.defs=l.svg.append("svg:defs"),l.defs.append("svg:marker").attr("id","marker-end-arrow").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-create").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-animated").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-hover").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-selection").attr("refX",4).attr("refY",3).attr("markerWidth",5).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.resetAddActions=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgOuter.on("click",null),l.inAddTransition=!1,l.inAddState=!1},l.addState=function(){l.resetAddActions(),l.svgOuter.on("mousemove",function(){l.selectedState.objReference.attr("transform","translate("+(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale)+" "+(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale)+")")}),l.selectedState=t.addStateWithPresets(-1e4,-1e4),l.selectedState.objReference.classed("state-in-creation",!0),l.svgOuter.on("click",function(){l.selectedState.objReference.classed("state-in-creation",!1),l.selectedState.x=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),l.selectedState.y=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),l.selectedState.objReference.attr("transform","translate("+l.selectedState.x+" "+l.selectedState.y+")"),l.svgOuter.on("mousemove",null),l.addSvgOuterClickListener(),l.preventSvgOuterClick=!1,t.safeApply()})},l.addTransition=function(){l.resetAddActions(),l.preventStateDragging=!0,d3.selectAll(".state").on("click",function(){if(l.mouseInState=!0,null===l.selectedState)l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.tmpTransition=l.svgTransitions.append("g").attr("class","transition"),l.tmpTransitionline=l.tmpTransition.append("path").attr("class","transition-line curvedLine in-creation").attr("marker-end","url(#marker-end-arrow-create)").attr("fill","none");else{var e=t.addTransition(l.selectedState.id,parseInt(d3.select(this).attr("object-id")),t.getNextTransitionName(l.selectedState.id));l.toggleState(l.selectedState.id,!1),l.tmpTransition.remove(),l.tmpTransition=null,l.tmpTransitionline=null,l.preventStateDragging=!1,l.addSvgOuterClickListener(),l.svgOuter.on("mousemove",null),d3.selectAll(".state").on("mouseover",null),d3.selectAll(".state").on("mouseleave",null),d3.selectAll(".state").on("click",l.openStateMenu),l.openTransitionMenu(e.id)}}),l.svgOuter.on("mousemove",function(){if(!l.mouseInState&&null!==l.selectedState){var e=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),a=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),n=l.bezierLine([[l.selectedState.x,l.selectedState.y],[e,a]]);l.tmpTransitionline.attr("d",n)}}),d3.selectAll(".state").on("mouseover",function(e){if(l.mouseInState=!0,null!==l.selectedState){var a=t.getStateById(d3.select(this).attr("object-id")),n={};n.fromState=l.selectedState.id,n.toState=a.id;var i=l.tmpTransitionline;if(l.existsDrawnTransition(l.selectedState.fromState,l.selectedState.toState)){var r=l.getDrawnTransition(n.fromState,n.toState);r.names.push(n.name),l.writeTransitionText(r.objReference.select(".transition-text"),r.names)}else if(n.fromState!=n.toState){var s=l.getTransitionDrawConfig(n);if(s.approachTransition){var o=l.getDrawnTransition(n.toState,n.fromState),c=l.getTransitionDrawConfig(o,!0);l.updateTransitionLines(o.objReference,c.path),o.objReference.select(".transition-text").attr("x",c.xText).attr("y",c.yText),l.otherTransition=o}i.attr("d",s.path)}else{var d=t.getArrayStateIdByStateId(n.fromState),u=t.config.states[d].x,f=t.config.states[d].y;i.attr("d",l.selfTransition(u,f))}l.tmpTransitionline.attr("x1",l.selectedState.x).attr("y1",l.selectedState.y).attr("x2",a.x).attr("y2",a.y)}}).on("mouseleave",function(){if(l.mouseInState=!1,null!==l.otherTransition&&void 0!==l.otherTransition){var t=l.getTransitionDrawConfig(l.otherTransition);l.updateTransitionLines(l.otherTransition.objReference,t.path),l.otherTransition.objReference.select(".transition-text").attr("x",t.xText).attr("y",t.yText)}})},l.renameState=function(e,a){var n=t.config.states[t.getArrayStateIdByStateId(e)],i=n.objReference;i.select("text").text(a)},l.removeState=function(e){l.closeStateMenu();var a=t.config.states[t.getArrayStateIdByStateId(e)],n=a.objReference;n.remove()},l.renameTransition=function(t,e,a,n){var i=l.getDrawnTransition(t,e),r=_.find(i.names,{id:a});r.name=n,l.writeTransitionText(i.objReference.select(".transition-text"),i.names)},l.removeTransition=function(e){var a=t.getTransitionById(e),n=l.getDrawnTransition(a.fromState,a.toState),i=l.getTransitionDrawConfig(a);if(l.closeTransitionMenu(),1===n.names.length){if(n.objReference.remove(),_.remove(t.config.drawnTransitions,function(t){return t==n}),i.approachTransition){var r=l.getDrawnTransition(a.toState,a.fromState),s=l.getTransitionDrawConfig(r,!1);l.updateTransitionLines(r.objReference,s.path),r.objReference.select(".transition-text").attr("x",s.xText).attr("y",s.yText),l.otherTransition=r}}else _.remove(n.names,function(t){return t.id==a.id}),l.writeTransitionText(n.objReference.select(".transition-text"),n.names),i=l.getTransitionDrawConfig(a),n.objReference.select(".transition-text").attr("x",i.xText).attr("y",i.yText),console.log(n),l.openTransitionMenu(n.names[n.names.length-1].id)},l.addFinalState=function(e){var a=t.getStateById(e);a.objReference.insert("circle",".state-circle").attr("class","final-state").attr("r",l.settings.finalStateRadius)},l.removeFinalState=function(e){var a=t.getStateById(e);a.objReference.select(".final-state").remove()},l.changeStartState=function(e){if(null!==t.config.startState){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove()}var n=t.getStateById(e);n.objReference.append("line").attr("class","transition-line start-line").attr("x1",0).attr("y1",-75).attr("x2",0).attr("y2",0-l.settings.stateRadius-4).attr("marker-end","url(#marker-end-arrow)")},l.removeStartState=function(e){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove(),t.config.startState=null,t.updateListener()},l.drawState=function(e){var a=t.getStateById(e),n=l.svgStates.append("g").attr("transform","translate("+a.x+" "+a.y+")").attr("class","state state-"+a.id).attr("object-id",a.id);n.append("circle").attr("class","state-circle").attr("r",l.settings.stateRadius),n.append("circle").attr("class","state-circle hover-circle").attr("r",l.settings.stateRadius),n.append("text").text(a.name).attr("class","state-text").attr("dominant-baseline","central").attr("text-anchor","middle");return a.objReference=n,n.on("click",l.openStateMenu).call(l.dragState),n},l.setStateClassAs=function(e,a,n){var i=t.getStateById(e).objReference;i.classed(n,a)},l.setTransitionClassAs=function(e,a,n){var i=t.getTransitionById(e),r=l.getDrawnTransition(i.fromState,i.toState).objReference;r.classed(n,a),a&&"animated-transition"==n?r.select(".transition-line").attr("marker-end","url(#marker-end-arrow-animated)"):r.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.setArrowMarkerTo=function(t,e){""!==e?t.select(".transition-line").attr("marker-end","url(#marker-end-arrow-"+e+")"):t.select(".transition-line").attr("marker-end","url(#marker-end-arrow)");
},l.openStateMenu=function(){console.log("open state menu"),l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply(),l.preventSvgOuterClick=!0,l.showStateMenu=!0,l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.input={},l.input.state=l.selectedState,l.input.stateName=l.selectedState.name,l.input.startState=t.config.startState==l.selectedState.id,l.input.finalState=t.isStateAFinalState(l.selectedState.id),l.input.ttt="",l.input.tttisopen=!1,t.safeApply(),l.stateMenuListener=[],l.stateMenuListener.push(t.$watch("statediagram.input.startState",function(e,a){e!==a&&(l.input.startState?t.changeStartState(l.input.state.id):l.selectedState.id==t.config.startState&&t.removeStartState())})),l.stateMenuListener.push(t.$watch("statediagram.input.finalState",function(e,a){e!==a&&(l.input.finalState?t.addFinalState(l.input.state.id):t.removeFinalState(l.input.state.id))})),l.stateMenuListener.push(t.$watch("statediagram.input.stateName",function(e,a){if(l.input.tttisopen=!1,e!==a)if(""===e||t.existsStateWithName(e))""===e?(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_TOO_SHORT"):t.existsStateWithName(e,l.input.state.id)&&(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_ALREADY_EXIST");else{!t.renameState(l.input.state.id,e)}}))},l.closeStateMenu=function(){_.forEach(l.stateMenuListener,function(t,e){t()}),null!==l.selectedState&&l.toggleState(l.selectedState.id,!1),l.stateMenuListener=null,l.showStateMenu=!1,l.input=null},l.toggleState=function(t,e){l.setStateClassAs(t,e,"active"),e===!1&&(l.selectedState=null)},l.dragState=d3.behavior.drag().on("dragstart",function(){l.dragAmount=0,d3.event.sourceEvent.stopPropagation()}).on("drag",function(){if(1==d3.event.sourceEvent.which&&!l.preventStateDragging){l.dragAmount++;var e=d3.event.x,a=d3.event.y;if(l.snapping){var n=e-e%l.gridSpace,i=a-a%l.gridSpace;e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n,a=i):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n+l.gridSpace,a=i):e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance?(e=n,a=i+l.gridSpace):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance&&(e=n+l.gridSpace,a=i+l.gridSpace)}if(l.dragAmount>1){d3.select(this).attr("transform","translate("+e+" "+a+")");var r=d3.select(this).attr("object-id"),s=t.getStateById(r);s.x=e,s.y=a,l.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"))}}}).on("dragend",function(){l.dragAmount>1&&t.safeApply()}),l.selfTransition=function(t,e){return l.bezierLine([[t-l.stateSelfReferenceNumber,e-l.stateSelfReferenceNumber],[t-l.stateSelfReferenceNumber-u,e-l.stateSelfReferenceNumber-f],[t-l.stateSelfReferenceNumber-u,e+l.stateSelfReferenceNumber+f],[t-l.stateSelfReferenceNumber,e+l.stateSelfReferenceNumber]])};var g=30;l.bezierLine=d3.svg.line().x(function(t){return t[0]}).y(function(t){return t[1]}).interpolate("basis"),l.getTransitionDrawConfig=function(e,n){var c=3,u={};u.approachTransition=n||l.existsDrawnTransition(e.toState,e.fromState);var f,m=t.getStateById(e.fromState),g=t.getStateById(e.toState),S=t.isStateAFinalState(e.toState),p=m.x,v=m.y,h=g.x,T=g.y,x={x:h-p,y:T-v},y=Math.sqrt(x.x*x.x+x.y*x.y),A=l.settings.stateRadius/y;f=S?(l.settings.stateRadius+c+5)/y:(l.settings.stateRadius+c)/y,u.xStart=p+A*x.x,u.yStart=v+A*x.y,u.xEnd=h-f*x.x,u.yEnd=T-f*x.y,u.xDiff=h-p,u.yDiff=T-v,u.xMid=(p+h)/2,u.yMid=(v+T)/2,u.distance=Math.sqrt(u.xDiff*u.xDiff+u.yDiff*u.yDiff);var w,I,M={x:u.xMid-u.xStart,y:u.yMid-u.yStart,z:0},D={x:0,y:0,z:1},b={x:1,y:0,z:0};if(w=20,I=a(M,D),I=s(I),I=r(I,w),u.approachTransition){var C=d({x:u.xStart-p,y:u.yStart-v},{x:l.settings.stateRadius,y:0}),L=d({x:u.xEnd-h,y:u.yEnd-T},{x:l.settings.stateRadius,y:0});u.xStart=p+l.settings.stateRadius*Math.cos(i(C.upperAngle)),u.yStart=v-l.settings.stateRadius*Math.sin(i(C.upperAngle)),u.xEnd=h+l.settings.stateRadius*Math.cos(i(L.lowerAngle)),u.yEnd=T-l.settings.stateRadius*Math.sin(i(L.lowerAngle))}w=35,I=a(M,D),I=s(I),I=r(I,w),u.xMidCurv=I.x+u.xMid,u.yMidCurv=I.y+u.yMid;var k,R=(l.existsDrawnTransition(m.id,g.id),l.getDrawnTransition(m.id,g.id));k=R?R.names.length:1;var E,N,_=o(M,b),B=_.degree;B>90&&(B=90-B%90);var O=Math.pow(B/90,.5);E=u.approachTransition?40+8*k*O:12+8*k*O,N=a(M,D),N=s(N),N=r(N,E),u.xText=N.x+u.xMid,u.yText=N.y+u.yMid;var F=[];return F=u.approachTransition?[[u.xStart,u.yStart],[u.xMidCurv,u.yMidCurv],[u.xEnd,u.yEnd]]:[[u.xStart,u.yStart],[u.xEnd,u.yEnd]],u.path=l.bezierLine(F),u},l.writeTransitionText=function(e,a){e.selectAll("*").remove();for(var n=0;n<a.length;n++)null!==t.simulator.animated.transition&&a[n].id===t.simulator.animated.transition.id?e.append("tspan").attr("transition-id",a[n].id).text(a[n].name).classed("animated-transition-text",!0):e.append("tspan").attr("transition-id",a[n].id).text(a[n].name),n<a.length-1&&e.append("tspan").text(" | ")},l.drawTransition=function(e){var a=t.getTransitionById(e);if(!l.existsDrawnTransition(a.fromState,a.toState)){var n=l.svgTransitions.append("g").attr("class","transition"),i=(n.append("path").attr("class","transition-line-selection").attr("fill","none").attr("marker-end","url(#marker-end-arrow-selection)"),n.append("path").attr("class","transition-line").attr("fill","none").attr("marker-end","url(#marker-end-arrow)"),n.append("path").attr("class","transition-line-click").attr("stroke-width",20).attr("stroke","transparent").attr("fill","none"),n.append("path").attr("class","transition-line-hover").attr("fill","none").attr("marker-end","url(#marker-end-arrow-hover)"),n.append("text").attr("class","transition-text").attr("dominant-baseline","central").attr("fill","black"));if(a.fromState!=a.toState){var r=l.getTransitionDrawConfig(a);if(r.approachTransition){var s=l.getDrawnTransition(a.toState,a.fromState),o=l.getTransitionDrawConfig(s,!0);l.updateTransitionLines(s.objReference,o.path),s.objReference.select(".transition-text").attr("x",o.xText).attr("y",o.yText)}i.attr("class","transition-text").attr("x",r.xText).attr("y",r.yText),l.updateTransitionLines(n,r.path)}else{var c=t.getArrayStateIdByStateId(a.fromState),d=t.config.states[c].x,u=t.config.states[c].y;l.updateTransitionLines(n,l.selfTransition(d,u)),i.attr("x",d-l.settings.stateRadius-50).attr("y",u)}return n.attr("object-id",t.config.drawnTransitions.push({fromState:a.fromState,toState:a.toState,names:[{id:a.id,name:a.name}],objReference:n})-1),l.writeTransitionText(i,l.getDrawnTransition(a.fromState,a.toState).names),n.attr("from-state-id",a.fromState).attr("to-state-id",a.toState).on("click",l.openTransitionMenu).on("mouseover",function(){d3.select(this).select(".transition-line-hover").attr("style","opacity:0.6")}).on("mouseleave",function(){d3.select(this).select(".transition-line-hover").attr("style","")}),n}var f=l.getDrawnTransition(a.fromState,a.toState);f.names.push({id:a.id,name:a.name}),l.writeTransitionText(f.objReference.select(".transition-text"),l.getDrawnTransition(a.fromState,a.toState).names);var m=l.getTransitionDrawConfig(a);f.objReference.select(".transition-text").attr("x",m.xText).attr("y",m.yText)},l.updateTransitionLines=function(t,e){t.select(".transition-line").attr("d",e),t.select(".transition-line-selection").attr("d",e),t.select(".transition-line-hover").attr("d",e),t.select(".transition-line-click").attr("d",e)},l.openTransitionMenu=function(e){l.closeStateMenu(),l.closeTransitionMenu(),l.preventSvgOuterClick=!0,l.showTransitionMenu=!0;var a,n;if(void 0===e)a=d3.select(this).attr("from-state-id"),n=d3.select(this).attr("to-state-id"),l.selectedTransition=l.getDrawnTransition(a,n);else{var i=t.getTransitionById(e);a=i.fromState,n=i.toState,l.selectedTransition=l.getDrawnTransition(a,n)}l.selectedTransition.objReference.classed("active",!0),l.input={},l.input.fromState=t.getStateById(a),l.input.toState=t.getStateById(n),l.input.transitions=[],_.forEach(l.selectedTransition.names,function(t,a){var n={};n=cloneObject(t),void 0!==e?t.id==e&&(n.isFocus=!0):l.selectedTransition.names.length-1===a&&(n.isFocus=!0),n.ttt="",n.tttisopen=!1,l.input.transitions.push(n)}),l.transitionMenuListener=[];for(var r=0;r<l.input.transitions.length;r++)l.transitionMenuListener.push(t.$watchCollection("statediagram.input.transitions['"+r+"']",function(e,i){e.name!==i.name&&(e.tttisopen=!1,""===e.name||t.existsTransition(a,n,e.name)?""===e.name?(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_TOO_SHORT"):t.existsTransition(a,n,e.name,e.id)&&(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_ALREAD_EXISTS"):t.renameTransition(e.id,e.name),console.log(t.existsTransition(a,n,e.name,e.id)))}));t.safeApply()},l.closeTransitionMenu=function(){_.forEach(l.transitionMenuListener,function(t,e){t()}),l.showTransitionMenu=!1,null!==l.selectedTransition&&(l.selectedTransition.objReference.classed("active",!1),l.selectedTransition=null)},l.updateTransitionsAfterStateDrag=function(e){t.config.states[t.getArrayStateIdByStateId(e)].name;_.forEach(t.config.drawnTransitions,function(a,n){if(a.fromState==e||a.toState==e){var i=a.objReference,r=i.select("text");if(a.fromState!=a.toState){var s=l.getTransitionDrawConfig(a);l.updateTransitionLines(i,s.path),r.attr("x",s.xText).attr("y",s.yText)}else{var o=a.fromState,c=t.config.states[t.getArrayStateIdByStateId(o)].x,d=t.config.states[t.getArrayStateIdByStateId(o)].y;l.updateTransitionLines(i,l.selfTransition(c,d)),r.attr("x",c-l.settings.stateRadius-50).attr("y",d)}}})},t.$watch("simulator.animated.currentState",function(e,a){e!==a&&(console.log("CURRENTSTATE:oldValue "+a+" newvalue "+e),console.log("status"+t.simulator.status),null!==a&&(l.setStateClassAs(a,!1,"animated-currentstate-svg"),l.setStateClassAs(a,!1,"animated-accepted-svg"),l.setStateClassAs(a,!1,"animated-not-accepted-svg")),null!==e&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"):l.setStateClassAs(e,!0,"animated-currentstate-svg")))}),t.$watch("simulator.animated.transition",function(t,e){t!==e&&(null!==e&&(l.setTransitionClassAs(e.id,!1,"animated-transition"),d3.selectAll("[transition-id='"+e.id+"'").classed("animated-transition-text",!1)),null!==t&&(l.setTransitionClassAs(t.id,!0,"animated-transition"),console.log(t),d3.selectAll("[transition-id='"+t.id+"'").classed("animated-transition-text",!0)))}),t.$watch("simulator.animated.nextState",function(t,e){t!==e&&(console.log("NEXTSTATE: oldValue "+e+" newvalue "+t),null!==e&&l.setStateClassAs(e,!1,"animated-nextstate-svg"),null!==t&&l.setStateClassAs(t,!0,"animated-nextstate-svg"))}),t.$watch("simulator.status",function(e,a){e!==a&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status&&l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"))})}function StatetransitionfunctionDFA(t){"use strict";var e=this;e.functionData={},e.functionData.states=[],e.functionData.startState="",e.functionData.finalStates="",e.functionData.transitions="",e.functionData.statetransitionfunction=[],t.updateListeners.push(e),e.updateFunction=function(){var a,n="",i="",r="",s="";e.functionData.transitions=t.config.alphabet,e.functionData.states=[],_.forEach(t.config.states,function(a,i){n="";var r="";null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id&&(r="selected"),n+=a.id==t.simulator.animated.currentState&&"accepted"===t.simulator.status?'<span class="animated-accepted '+r+'">':a.id==t.simulator.animated.currentState&&"not accepted"===t.simulator.status?'<span class="animated-not-accepted '+r+'">':a.id==t.simulator.animated.currentState?'<span class="animated-currentstate '+r+'">':'<span class="'+r+'">',n+=a.name,n+="</span>",i<t.config.states.length-1&&(n+=", "),e.functionData.states.push(n)}),e.functionData.statetransitionfunction=[],_.forEach(t.config.states,function(a,n){_.forEach(t.config.transitions,function(n,r){if(n.fromState===a.id){var s=n,o=!1;null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{id:n.id})&&(o=!0);var c=!1;t.simulator.animated.transition&&t.simulator.animated.transition.id===s.id&&(c=!0),i=c||o?'(<span class=" '+(c?"animated-transition":"")+" "+(o?"selected":"")+'">':"(<span>",i+=t.getStateById(s.fromState).name+", ",i+=s.name+", ",i+=t.getStateById(s.toState).name+"</span>)",e.functionData.statetransitionfunction.push(i)}})}),a=t.getStateById(t.config.startState),void 0!==a&&(r+='<span class="">'+a.name+"</span>"),e.functionData.startState=r,_.forEach(t.config.finalStates,function(e,a){e=t.getStateById(e),s=e.name,a<t.config.finalStates.length-1&&(s+=", ")}),e.functionData.finalStates=s},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.status",function(t,a){t!==a&&e.updateFunction()})}function TableDFA(t){var e=this;e.states=[],t.updateListeners.push(e),e.updateFunction=function(){e.states=[],e.alphabet=[];t.config;_.forEach(t.config.alphabet,function(a,n){var i="";null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{name:a})&&(i="selected");var r;r=t.simulator.animated.transition&&t.simulator.animated.transition.name===a?'<span class="animated-transition '+i+'">'+a+"</span>":'<span class="'+i+'">'+a+"</span>",e.alphabet.push(r)}),_.forEach(t.config.states,function(a,n){var i={};i.id=a.id;var r="";if((null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id||null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.fromState===a.id)&&(r="selected"),t.simulator.animated.currentState==a.id){var s="";s="accepted"===t.simulator.status?"animated-accepted":"not accepted"===t.simulator.status?"animated-not-accepted":"animated-currentstate",i.name='<span class="'+s+" "+r+'">'+a.name+"</span>"}else i.name='<span class="'+r+'">'+a.name+"</span>";t.isStateAFinalState(a.id)?i.finalState=!0:i.finalState=!1,t.config.startState===a.id?i.startState=!0:i.startState=!1,i.trans=[],_.forEach(t.config.alphabet,function(e,n){var r=null;_.forEach(t.config.transitions,function(t,n){t.fromState===a.id&&t.name===e&&(r=t)});var s={};if(s.alphabet=e,null!==r){var o=t.getStateById(r.toState),c="";null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.toState===o.id&&(c="selected"),t.simulator.animated.nextState==o.id&&r.name==t.simulator.animated.transition.name?s.State='<span class="animated-nextstate '+c+'">'+o.name+"</span>":s.State='<span class="'+c+'">'+o.name+"</span>"}else s.State="";i.trans.push(s)}),e.states.push(i)})},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.nextState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()})}function DFA(t,e){"use strict";window.debugScope=t,t.defaultConfig={},t.defaultConfig.statePrefix="S",t.defaultConfig.transitionNameSuffix="|",t.defaultConfig.diagramm={x:0,y:0,scale:1,updatedWithZoomBehavior:!1},t.defaultConfig.countStateId=0,t.defaultConfig.countTransitionId=0,t.defaultConfig.states=[],t.defaultConfig.startState=null,t.defaultConfig.finalStates=[],t.defaultConfig.transitions=[],t.defaultConfig.alphabet=[],t.defaultConfig.inputWord="",t.defaultConfig.name="Untitled Automaton",t.defaultConfig.unSavedChanges=!1,t.defaultConfig.drawnTransitions=[],t.config=cloneObject(t.defaultConfig),t.updateListeners=[],t.simulator=new SimulationDFA(t),t.table=new TableDFA(t),t.statediagram=new StateDiagramDFA(t,"#diagramm-svg"),t.statetransitionfunction=new StatetransitionfunctionDFA(t),t.testData=new TestData(t),t.inNameEdit=!1,t.showModalWithMessage=function(e,a,n,i){t.title=e,t.description=a,t.modalAction=n,void 0===i?t.button="MODAL_BUTTON.PROCEED":t.button=i,$("#modal").modal()},t.executeModalAction=function(){t.$eval(t.modalAction)},t.stepTimeOutSlider={options:{floor:0,step:100,ceil:3e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.loopTimeOutSlider={options:{floor:0,step:100,ceil:4e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.keypressCallback=function(t){13==t.charCode&&document.getElementById("automatonNameEdit").blur()},window.onbeforeunload=function(e){if(t.config.unSavedChanges){var a="All Changes will be Lost. Save before continue!";return"undefined"==typeof e&&(e=window.event),e&&(e.returnValue=a),a}},t.saveAutomaton=function(){t.config.unSavedChanges=!1},t.safeApply=function(t){var e=this.$root.$$phase;"$apply"==e||"$digest"==e?t&&"function"==typeof t&&t():this.$apply(t)},t.resetAutomaton=function(){t.statediagram.clearSvgContent(),t.simulator.reset(),t.config=cloneObject(t.defaultConfig),t.safeApply(),t.updateListener()},t.addToAlphabet=function(e){_.some(t.config.alphabet,function(t){return t===e})||t.config.alphabet.push(e)},t.removeFromAlphabetIfNotUsedFromOthers=function(e){for(var a=t.getTransitionById(e),n=!1,i=0;i<t.config.transitions.length;i++)if(a.name===t.config.transitions[i].name&&t.config.transitions[i].id!==e)return void(n=!0);return n?!1:(_.pull(t.config.alphabet,a.name),!0)},t.updateListener=function(){_.forEach(t.updateListeners,function(t,e){t.updateFunction()}),t.config.unSavedChanges=!0},t.existsStateWithName=function(e,a){var n=!1;return _.forEach(t.config.states,function(t){return t.name==e&&t.id!==a?void(n=!0):void 0}),n},t.existsStateWithId=function(e){for(var a=0;a<t.config.states.length;a++)if(t.config.states[a].id==e)return!0;return!1},t.hasStateTransitions=function(e){var a=!1;return _.forEach(t.config.transitions,function(t){t.fromState!=e&&t.toState!=e||(a=!0)}),a},t.getArrayStateIdByStateId=function(e){return _.findIndex(t.config.states,function(t){return t.id==e?t:void 0})},t.getStateById=function(e){return t.config.states[t.getArrayStateIdByStateId(e)]},t.getStateByName=function(e){return t.config.states[t.getArrayStateIdByStateId(function(t){})]},t.addStateWithPresets=function(e,a){var n=t.addState(t.config.statePrefix+t.config.countStateId,e,a);return 1==t.config.countStateId&&t.changeStartState(0),n},t.addState=function(e,a,n){return t.existsStateWithName(e)?null:t.addStateWithId(t.config.countStateId++,e,a,n)},t.addStateWithId=function(e,a,n,i){return t.config.states.push(new State(e,a,n,i)),t.statediagram.drawState(e),t.updateListener(),t.safeApply(),t.getStateById(e)},t.removeState=function(e){t.hasStateTransitions(e)?t.showModalWithMessage("STATE_MENU.DELETE_MODAL_TITLE","STATE_MENU.DELETE_MODAL_DESC","forcedRemoveState("+e+")","MODAL_BUTTON.DELETE"):(t.isStateAFinalState(e)&&t.removeFinalState(e),t.config.startState==e&&(t.config.startState=null),t.statediagram.removeState(e),t.config.states.splice(t.getArrayStateIdByStateId(e),1),t.updateListener())},t.forcedRemoveState=function(e){for(var a=0;a<t.config.transitions.length;a++){var n=t.config.transitions[a];n.fromState!==e&&n.toState!==e||(t.removeTransition(n.id),a--)}t.removeState(e)},t.renameState=function(e,a){return t.existsStateWithName(a)?!1:(t.getStateById(e).name=a,t.statediagram.renameState(e,a),t.updateListener(),!0)},t.changeStartState=function(e){t.existsStateWithId(e)&&(t.statediagram.changeStartState(e),t.config.startState=e,t.updateListener())},t.removeStartState=function(){null!==t.config.startState&&(t.statediagram.removeStartState(),t.updateListener(),t.config.startState=null)},t.getFinalStateIndexByStateId=function(e){return _.indexOf(t.config.finalStates,e)},t.isStateAFinalState=function(e){for(var a=0;a<t.config.finalStates.length;a++)if(t.config.finalStates[a]==e)return!0;return!1},t.addFinalState=function(e){t.isStateAFinalState(e)||(t.config.finalStates.push(e),t.statediagram.addFinalState(e),t.updateListener())},t.removeFinalState=function(e){t.isStateAFinalState(e)&&(t.statediagram.removeFinalState(e),t.updateListener(),t.config.finalStates.splice(t.getFinalStateIndexByStateId(e),1))},t.existsTransition=function(e,a,n,i){for(var r=!1,s=0;s<t.config.transitions.length;s++){var o=t.config.transitions[s];o.fromState==e&&o.name==n&&o.id!==i&&(r=!0)}return r},t.getNextTransitionName=function(e){for(var a=[],n=0;n<t.config.transitions.length;n++)t.config.transitions[n].fromState==e&&a.push(t.config.transitions[n].name);for(var i=!1,r="a";!i;){var s=_.indexOf(a,r);-1===s?i=!0:r=String.fromCharCode(r.charCodeAt()+1)}return r},t.addTransition=function(e,a,n){return!t.existsTransition(e,a,n)&&t.existsStateWithId(e)&&t.existsStateWithId(a)?(t.addToAlphabet(n),t.addTransitionWithId(t.config.countTransitionId++,e,a,n)):void 0},t.addTransitionWithId=function(e,a,n,i){return t.config.transitions.push(new TransitionDFA(e,a,n,i)),t.statediagram.drawTransition(e),t.updateListener(),t.safeApply(),t.getTransitionById(e)},t.getArrayTransitionIdByTransitionId=function(e){return _.findIndex(t.config.transitions,function(t){return t.id==e?t:void 0})},t.getTransitionById=function(e){return t.config.transitions[t.getArrayTransitionIdByTransitionId(e)]},t.getTransition=function(e,a,n){for(var i=0;i<t.config.transitions.length;i++){var r=t.config.transitions[i];if(r.fromState==e&&r.toState==a&&r.name==n)return r}},t.removeTransition=function(e){t.removeFromAlphabetIfNotUsedFromOthers(e),t.statediagram.removeTransition(e),t.config.transitions.splice(t.getArrayTransitionIdByTransitionId(e),1),t.updateListener()},t.renameTransition=function(e,a){var n=t.getTransitionById(e);return t.existsTransition(n.fromState,n.toState,a)?!1:(t.getTransitionById(e),t.removeFromAlphabetIfNotUsedFromOthers(e),t.addToAlphabet(a),t.getTransitionById(e).name=a,t.statediagram.renameTransition(n.fromState,n.toState,e,a),t.updateListener(),!0)}}function SimulationDFA(t){"use strict";var e=this;e.isInPlay=!1,e.loopSimulation=!0,e.stepTimeOut=1500,e.loopTimeOut=2e3,e.simulationPaused=!1,e.simulationSettings=!0,e.currentState=null,e.nextState=null,e.transition=null,e.isInputAccepted=!1,e.settings=function(){e.simulationSettings=!e.simulationSettings},e.animated={currentState:null,transition:null,nextState:null},e.reset=function(){e.animated={currentState:null,transition:null,nextState:null},e.goneTransitions=[],e.currentState=t.config.startState,e.transition=null,e.animatedTransition=!1,e.nextState=null,e.animatedNextState=!1,e.isNextStepCalculated=!1,e.simulationStarted=!1,e.statusSequence=[t.config.startState],e.madeSteps=0,e.inputWord=t.config.inputWord,e.processedWord="",e.nextChar="",e.status="stopped"},e.pause=function(){e.simulationPaused||(e.simulationPaused=!0,e.isInPlay=!1)},e.stop=function(){e.pause(),e.reset()},e.play=function(){e.simulationPaused||(e.simulationStarted?((e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&(e.animateNextMove(),t.safeApply(function(){}),(e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&setTimeout(e.play,e.stepTimeOut)),e.isNextStepCalculated||"accepted"!=e.status||(e.loopSimulation?setTimeout(e.play,e.loopTimeOut):e.isInPlay=!1,e.simulationStarted=!1,t.safeApply(function(){}))):e.prepareSimulation())},e.prepareSimulation=function(){e.reset(),e.simulationStarted=!0,e.animated.currentState=_.last(e.statusSequence),t.safeApply(),setTimeout(e.play,e.loopTimeOut)},e.animateNextMove=function(){e.isNextStepCalculated||e.calcNextStep(),e.animatedTransition?!e.animatedNextState&&e.animatedTransition?(e.animatedNextState=!0,e.animated.nextState=e.nextState):e.animatedTransition&&e.animatedNextState&&(e.animated.transition=null,e.animated.nextState=null,e.animated.currentState=e.nextState,e.currentState=e.nextState,e.madeSteps++,e.inputWord.length==e.madeSteps&&(_.include(t.config.finalStates,e.currentState)?e.status="accepted":e.status="not accepted"),e.isNextStepCalculated=!1,e.animatedNextState=!1,e.animatedTransition=!1,e.processedWord+=e.nextChar,e.statusSequence.push(e.currentState),"accepted"!==e.status&&"not accepted"!==e.status&&e.calcNextStep()):(e.animatedTransition=!0,e.animated.transition=e.transition,e.goneTransitions.push(e.transition))},e.calcNextStep=function(){return e.isNextStepCalculated=!0,e.status="step",e.nextChar=e.inputWord[e.madeSteps],e.transition=_.filter(t.config.transitions,function(t){return void 0===e.nextChar?void(e.status="not accepted"):t.fromState==_.last(e.statusSequence)&&t.name==e.nextChar}),_.isEmpty(e.transition)?(e.transition=null,void(e.status="not accepted")):(e.transition=e.transition[0],void(e.nextState=e.transition.toState))},e.stepForward=function(){if(e.simulationPaused||e.pause(),e.simulationStarted){if(!_.include(["step","stopped","accepted","not accepted"],e.status))return void console.log(e.status);_.include(["accepted","not accepted"],e.status)||e.animateNextMove()}else e.prepareSimulation(),e.status="step"},e.stepBackward=function(){e.simulationPaused||e.pause(),_.include(["step","accepted","not accepted"],e.status)&&(e.status="step",e.animatedTransition||e.animatedNextState||0!==e.madeSteps?e.animateLastMove():e.reset())},e.animateLastMove=function(){console.log(e.animatedTransition+" "+e.animatedNextState),e.animatedTransition&&e.animatedNextState?(e.animated.nextState=null,e.animatedNextState=!1):e.animatedTransition?(e.animated.transition=null,e.animatedTransition=!1,e.goneTransitions.pop()):e.calcLastStep()},e.calcLastStep=function(){e.nextChar=e.processedWord.slice(-1),console.log(e.nextChar+" "+e.statusSequence[e.statusSequence.length-2]),e.transition=_.last(e.goneTransitions),console.log(e.transition),_.pullAt(e.goneTransitions,e.goneTransitions.length),e.animatedTransition=!0,e.animated.transition=e.transition;var t=e.currentState;e.currentState=e.transition.fromState,e.nextState=t,e.animated.nextState=e.nextState,e.animatedNextState=!0,e.animated.currentState=e.currentState,e.madeSteps--,e.statusSequence.splice(-1,1),e.processedWord=e.processedWord.slice(0,-1)},e.getNextTransition=function(e,a){for(var n=0;n<t.config.transitions.length;n++){var i=t.config.transitions[n];if(i.fromState==e&&i.name==a)return i}},e.check=function(){var a=!1,n=[];n.push(t.config.startState);for(var i="",r=0,s=null;r<=t.config.inputWord.length&&(i=t.config.inputWord[r],s=e.getNextTransition(_.last(n),i),!_.isEmpty(s));)if(n.push(s.toState),r++,t.config.inputWord.length==r){if(_.include(t.config.finalStates,_.last(n))){a=!0;break}break}return a},e.isPlayable=function(){return t.config.states.length>=1&&t.config.transitions.length>=1&&null!==t.config.startState&&t.config.finalStates.length>=1},e.playOrPause=function(){e.isPlayable()&&(e.isInPlay=!e.isInPlay,e.isInPlay?(e.simulationPaused=!1,e.play()):e.pause())},t.updateListeners.push(e),e.updateFunction=function(){e.isInputAccepted=e.check()}}function StateDiagramDFA(t,e){"use strict";function a(t,e){var a={x:t.y*e.z,y:-t.x*e.z};return a}function n(t){return t*(180/Math.PI)}function i(t){return t*(Math.PI/180)}function r(t,e){return{x:t.x*e,y:t.y*e}}function s(t){var e=1/Math.sqrt(t.x*t.x+t.y*t.y);return{x:t.x*e,y:t.y*e}}function o(t,e){var a=(t.x*e.x+t.y*e.y)/(Math.sqrt(t.x*t.x+t.y*t.y)*Math.sqrt(e.x*e.x+e.y*e.y)),i=Math.acos(a);return{val:a,rad:i,degree:n(i)}}function c(t,e){var a=t.x*e.x+t.y*e.y,n=t.x*e.y-t.y*e.x;return Math.atan2(n,a)}function d(t,e){var a=n(c(t,e));0>a&&(a+=360);var i=a+g;i>360&&(i-=360);var r=a-g;return 0>r&&(r+=360),{angle:a,lowerAngle:r,upperAngle:i}}var l=this;l.preventStateDragging=!1,l.inAddTransition=!1,l.selectedState=null,l.preventSvgOuterClick=!1,l.selectedTransition=null,l.showStateMenu=!1,l.showTransitionMenu=!1,l.selectedStateName="selectedForTransition",l.snapping=!0,l.settings={stateRadius:25,finalStateRadius:29,selected:!1};var u=40,f=18;l.stateSelfReferenceNumber=Math.sin(45*(Math.PI/180))*l.settings.stateRadius,l.existsDrawnTransition=function(e,a){for(var n=!1,i=0;i<t.config.drawnTransitions.length;i++){var r=t.config.drawnTransitions[i];r.fromState==e&&r.toState==a&&(n=!0)}return n},l.getDrawnTransition=function(e,a){for(var n=0;n<t.config.drawnTransitions.length;n++){var i=t.config.drawnTransitions[n];if(i.fromState==e&&i.toState==a)return i}},l.clearSvgContent=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgTransitions.html(""),l.svgStates.html(""),t.config.drawnTransitions=[],l.svg.attr("transform","translate("+t.defaultConfig.diagramm.x+","+t.defaultConfig.diagramm.y+") scale("+t.defaultConfig.diagramm.scale+")"),m.scale(t.defaultConfig.diagramm.scale),m.translate([t.defaultConfig.diagramm.x,t.defaultConfig.diagramm.y])},l.zoomMax=2.5,l.zoomMin=.5,l.zoomValue=.1,l.zoomIn=function(){t.config.diagramm.scale=t.config.diagramm.scale+l.zoomValue>l.zoomMax?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale+l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomOut=function(){t.config.diagramm.scale=t.config.diagramm.scale-l.zoomValue<=l.zoomMin?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale-l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomTo=function(e){console.log("zoomtedto"),t.config.diagramm.scale=e/100,t.safeApply(),l.updateZoomBehaviour()},l.updateZoomBehaviour=function(){t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")"),m.scale(t.config.diagramm.scale),m.translate([t.config.diagramm.x,t.config.diagramm.y])},l.zoomFitWindow=function(){var e,a=[],n=[],i=0,r=0,s=0,o=0,c=0,d=0,u=l.svgOuter.style("width").replace("px",""),f=l.svgOuter.style("height").replace("px","");if(t.config.diagramm.scale=1,t.config.states.length>0){for(e=0;e<t.config.states.length;e++)a[e]=t.config.states[e].x;for(e=0;e<t.config.states.length;e++)n[e]=t.config.states[e].y;for(i=_.min(a),r=_.max(a),s=_.min(n),o=_.max(n);r-i+150>u/t.config.diagramm.scale||o-s+200>f/t.config.diagramm.scale;)t.config.diagramm.scale-=.01;t.safeApply(),c=(f/t.config.diagramm.scale-(o-s))/2,d=(u/t.config.diagramm.scale-(r-i))/2,t.config.diagramm.x=-(i*t.config.diagramm.scale)+d*t.config.diagramm.scale,t.config.diagramm.y=-(s*t.config.diagramm.scale)+c*t.config.diagramm.scale,l.updateZoomBehaviour()}else l.scaleAndTranslateToDefault()},l.scaleAndTranslateToDefault=function(){t.config.diagramm.scale=t.defaultConfig.diagramm.scale,t.config.diagramm.x=t.defaultConfig.diagramm.x,t.config.diagramm.y=t.defaultConfig.diagramm.y,t.safeApply(),l.updateZoomBehaviour()};var m=d3.behavior.zoom().scaleExtent([l.zoomMin,l.zoomMax]).on("zoom",function(){var e=d3.event.button||d3.event.ctrlKey;if(e&&d3.event.stopImmediatePropagation(),3!==d3.event.sourceEvent.which){var a=Math.floor(100*d3.event.scale)/100;t.config.diagramm.scale=a,t.config.diagramm.x=d3.event.translate[0],t.config.diagramm.y=d3.event.translate[1],t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")")}else console.log("rightclick!")});l.svgOuter=d3.select(e).call(m).on("dblclick.zoom",null).on("contextmenu",function(){d3.event.preventDefault()}),l.addSvgOuterClickListener=function(){l.svgOuter.on("click",function(){l.preventSvgOuterClick?l.preventSvgOuterClick=!1:(l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply())})},l.addSvgOuterClickListener(),l.svgGrid=l.svgOuter.append("g").attr("id","grid"),l.svg=l.svgOuter.append("g").attr("id","svg-items"),l.svgTransitions=l.svg.append("g").attr("id","transitions"),l.svgStates=l.svg.append("g").attr("id","states"),l.gridSpace=100,l.gridSnapDistance=20,
l.isGrid=!0,t.$watch("[statediagram.isGrid , config.diagramm]",function(){l.drawGrid()},!0),l.drawGrid=function(){if(l.isGrid){l.svgGrid.html("");var e,a=l.svgOuter.style("width").replace("px",""),n=l.svgOuter.style("height").replace("px",""),i=1*t.config.diagramm.scale*.5,r=t.config.diagramm.x%(l.gridSpace*t.config.diagramm.scale),s=t.config.diagramm.y%(l.gridSpace*t.config.diagramm.scale);for(e=r;a>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line xgrid-line").attr("x1",e).attr("y1",0).attr("x2",e).attr("y2",n);for(e=s;n>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line ygrid-line").attr("x1",0).attr("y1",e).attr("x2",a).attr("y2",e)}else l.svgGrid.html("")},l.defs=l.svg.append("svg:defs"),l.defs.append("svg:marker").attr("id","marker-end-arrow").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-create").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-animated").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-hover").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-selection").attr("refX",4).attr("refY",3).attr("markerWidth",5).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.resetAddActions=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgOuter.on("click",null),l.inAddTransition=!1,l.inAddState=!1},l.addState=function(){l.resetAddActions(),l.svgOuter.on("mousemove",function(){l.selectedState.objReference.attr("transform","translate("+(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale)+" "+(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale)+")")}),l.selectedState=t.addStateWithPresets(-1e4,-1e4),l.selectedState.objReference.classed("state-in-creation",!0),l.svgOuter.on("click",function(){l.selectedState.objReference.classed("state-in-creation",!1),l.selectedState.x=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),l.selectedState.y=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),l.selectedState.objReference.attr("transform","translate("+l.selectedState.x+" "+l.selectedState.y+")"),l.svgOuter.on("mousemove",null),l.addSvgOuterClickListener(),l.preventSvgOuterClick=!1,t.safeApply()})},l.addTransition=function(){l.resetAddActions(),l.preventStateDragging=!0,d3.selectAll(".state").on("click",function(){if(l.mouseInState=!0,null===l.selectedState)l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.tmpTransition=l.svgTransitions.append("g").attr("class","transition"),l.tmpTransitionline=l.tmpTransition.append("path").attr("class","transition-line curvedLine in-creation").attr("marker-end","url(#marker-end-arrow-create)").attr("fill","none");else{var e=t.addTransition(l.selectedState.id,parseInt(d3.select(this).attr("object-id")),t.getNextTransitionName(l.selectedState.id));l.toggleState(l.selectedState.id,!1),l.tmpTransition.remove(),l.tmpTransition=null,l.tmpTransitionline=null,l.preventStateDragging=!1,l.addSvgOuterClickListener(),l.svgOuter.on("mousemove",null),d3.selectAll(".state").on("mouseover",null),d3.selectAll(".state").on("mouseleave",null),d3.selectAll(".state").on("click",l.openStateMenu),l.openTransitionMenu(e.id)}}),l.svgOuter.on("mousemove",function(){if(!l.mouseInState&&null!==l.selectedState){var e=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),a=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),n=l.bezierLine([[l.selectedState.x,l.selectedState.y],[e,a]]);l.tmpTransitionline.attr("d",n)}}),d3.selectAll(".state").on("mouseover",function(e){if(l.mouseInState=!0,null!==l.selectedState){var a=t.getStateById(d3.select(this).attr("object-id")),n={};n.fromState=l.selectedState.id,n.toState=a.id;var i=l.tmpTransitionline;if(l.existsDrawnTransition(l.selectedState.fromState,l.selectedState.toState)){var r=l.getDrawnTransition(n.fromState,n.toState);r.names.push(n.name),l.writeTransitionText(r.objReference.select(".transition-text"),r.names)}else if(n.fromState!=n.toState){var s=l.getTransitionDrawConfig(n);if(s.approachTransition){var o=l.getDrawnTransition(n.toState,n.fromState),c=l.getTransitionDrawConfig(o,!0);l.updateTransitionLines(o.objReference,c.path),o.objReference.select(".transition-text").attr("x",c.xText).attr("y",c.yText),l.otherTransition=o}i.attr("d",s.path)}else{var d=t.getArrayStateIdByStateId(n.fromState),u=t.config.states[d].x,f=t.config.states[d].y;i.attr("d",l.selfTransition(u,f))}l.tmpTransitionline.attr("x1",l.selectedState.x).attr("y1",l.selectedState.y).attr("x2",a.x).attr("y2",a.y)}}).on("mouseleave",function(){if(l.mouseInState=!1,null!==l.otherTransition&&void 0!==l.otherTransition){var t=l.getTransitionDrawConfig(l.otherTransition);l.updateTransitionLines(l.otherTransition.objReference,t.path),l.otherTransition.objReference.select(".transition-text").attr("x",t.xText).attr("y",t.yText)}})},l.renameState=function(e,a){var n=t.config.states[t.getArrayStateIdByStateId(e)],i=n.objReference;i.select("text").text(a)},l.removeState=function(e){l.closeStateMenu();var a=t.config.states[t.getArrayStateIdByStateId(e)],n=a.objReference;n.remove()},l.renameTransition=function(t,e,a,n){var i=l.getDrawnTransition(t,e),r=_.find(i.names,{id:a});r.name=n,l.writeTransitionText(i.objReference.select(".transition-text"),i.names)},l.removeTransition=function(e){var a=t.getTransitionById(e),n=l.getDrawnTransition(a.fromState,a.toState),i=l.getTransitionDrawConfig(a);if(l.closeTransitionMenu(),1===n.names.length){if(n.objReference.remove(),_.remove(t.config.drawnTransitions,function(t){return t==n}),i.approachTransition){var r=l.getDrawnTransition(a.toState,a.fromState),s=l.getTransitionDrawConfig(r,!1);l.updateTransitionLines(r.objReference,s.path),r.objReference.select(".transition-text").attr("x",s.xText).attr("y",s.yText),l.otherTransition=r}}else _.remove(n.names,function(t){return t.id==a.id}),l.writeTransitionText(n.objReference.select(".transition-text"),n.names),i=l.getTransitionDrawConfig(a),n.objReference.select(".transition-text").attr("x",i.xText).attr("y",i.yText),console.log(n),l.openTransitionMenu(n.names[n.names.length-1].id)},l.addFinalState=function(e){var a=t.getStateById(e);a.objReference.insert("circle",".state-circle").attr("class","final-state").attr("r",l.settings.finalStateRadius)},l.removeFinalState=function(e){var a=t.getStateById(e);a.objReference.select(".final-state").remove()},l.changeStartState=function(e){if(null!==t.config.startState){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove()}var n=t.getStateById(e);n.objReference.append("line").attr("class","transition-line start-line").attr("x1",0).attr("y1",-75).attr("x2",0).attr("y2",0-l.settings.stateRadius-4).attr("marker-end","url(#marker-end-arrow)")},l.removeStartState=function(e){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove(),t.config.startState=null,t.updateListener()},l.drawState=function(e){var a=t.getStateById(e),n=l.svgStates.append("g").attr("transform","translate("+a.x+" "+a.y+")").attr("class","state state-"+a.id).attr("object-id",a.id);return n.append("circle").attr("class","state-circle").attr("r",l.settings.stateRadius),n.append("circle").attr("class","state-circle hover-circle").attr("r",l.settings.stateRadius),n.append("text").text(a.name).attr("class","state-text").attr("dominant-baseline","central").attr("text-anchor","middle"),a.objReference=n,n.on("click",l.openStateMenu).call(l.dragState),n},l.setStateClassAs=function(e,a,n){var i=t.getStateById(e).objReference;i.classed(n,a)},l.setTransitionClassAs=function(e,a,n){var i=t.getTransitionById(e),r=l.getDrawnTransition(i.fromState,i.toState).objReference;r.classed(n,a),a&&"animated-transition"==n?r.select(".transition-line").attr("marker-end","url(#marker-end-arrow-animated)"):r.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.setArrowMarkerTo=function(t,e){""!==e?t.select(".transition-line").attr("marker-end","url(#marker-end-arrow-"+e+")"):t.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.openStateMenu=function(){console.log("open state menu"),l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply(),l.preventSvgOuterClick=!0,l.showStateMenu=!0,l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.input={},l.input.state=l.selectedState,l.input.stateName=l.selectedState.name,l.input.startState=t.config.startState==l.selectedState.id,l.input.finalState=t.isStateAFinalState(l.selectedState.id),l.input.ttt="",l.input.tttisopen=!1,t.safeApply(),l.stateMenuListener=[],l.stateMenuListener.push(t.$watch("statediagram.input.startState",function(e,a){e!==a&&(l.input.startState?t.changeStartState(l.input.state.id):l.selectedState.id==t.config.startState&&t.removeStartState())})),l.stateMenuListener.push(t.$watch("statediagram.input.finalState",function(e,a){e!==a&&(l.input.finalState?t.addFinalState(l.input.state.id):t.removeFinalState(l.input.state.id))})),l.stateMenuListener.push(t.$watch("statediagram.input.stateName",function(e,a){l.input.tttisopen=!1,e!==a&&(""===e||t.existsStateWithName(e)?""===e?(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_TOO_SHORT"):t.existsStateWithName(e,l.input.state.id)&&(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_ALREADY_EXIST"):!t.renameState(l.input.state.id,e))}))},l.closeStateMenu=function(){_.forEach(l.stateMenuListener,function(t,e){t()}),null!==l.selectedState&&l.toggleState(l.selectedState.id,!1),l.stateMenuListener=null,l.showStateMenu=!1,l.input=null},l.toggleState=function(t,e){l.setStateClassAs(t,e,"active"),e===!1&&(l.selectedState=null)},l.dragState=d3.behavior.drag().on("dragstart",function(){l.dragAmount=0,d3.event.sourceEvent.stopPropagation()}).on("drag",function(){if(1==d3.event.sourceEvent.which&&!l.preventStateDragging){l.dragAmount++;var e=d3.event.x,a=d3.event.y;if(l.snapping){var n=e-e%l.gridSpace,i=a-a%l.gridSpace;e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n,a=i):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n+l.gridSpace,a=i):e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance?(e=n,a=i+l.gridSpace):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance&&(e=n+l.gridSpace,a=i+l.gridSpace)}if(l.dragAmount>1){d3.select(this).attr("transform","translate("+e+" "+a+")");var r=d3.select(this).attr("object-id"),s=t.getStateById(r);s.x=e,s.y=a,l.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"))}}}).on("dragend",function(){l.dragAmount>1&&t.safeApply()}),l.selfTransition=function(t,e){return l.bezierLine([[t-l.stateSelfReferenceNumber,e-l.stateSelfReferenceNumber],[t-l.stateSelfReferenceNumber-u,e-l.stateSelfReferenceNumber-f],[t-l.stateSelfReferenceNumber-u,e+l.stateSelfReferenceNumber+f],[t-l.stateSelfReferenceNumber,e+l.stateSelfReferenceNumber]])};var g=30;l.bezierLine=d3.svg.line().x(function(t){return t[0]}).y(function(t){return t[1]}).interpolate("basis"),l.getTransitionDrawConfig=function(e,n){var c=3,u={};u.approachTransition=n||l.existsDrawnTransition(e.toState,e.fromState);var f,m=t.getStateById(e.fromState),g=t.getStateById(e.toState),S=t.isStateAFinalState(e.toState),p=m.x,v=m.y,h=g.x,T=g.y,x={x:h-p,y:T-v},y=Math.sqrt(x.x*x.x+x.y*x.y),A=l.settings.stateRadius/y;f=S?(l.settings.stateRadius+c+5)/y:(l.settings.stateRadius+c)/y,u.xStart=p+A*x.x,u.yStart=v+A*x.y,u.xEnd=h-f*x.x,u.yEnd=T-f*x.y,u.xDiff=h-p,u.yDiff=T-v,u.xMid=(p+h)/2,u.yMid=(v+T)/2,u.distance=Math.sqrt(u.xDiff*u.xDiff+u.yDiff*u.yDiff);var w,I,M={x:u.xMid-u.xStart,y:u.yMid-u.yStart,z:0},D={x:0,y:0,z:1},b={x:1,y:0,z:0};if(w=20,I=a(M,D),I=s(I),I=r(I,w),u.approachTransition){var C=d({x:u.xStart-p,y:u.yStart-v},{x:l.settings.stateRadius,y:0}),L=d({x:u.xEnd-h,y:u.yEnd-T},{x:l.settings.stateRadius,y:0});u.xStart=p+l.settings.stateRadius*Math.cos(i(C.upperAngle)),u.yStart=v-l.settings.stateRadius*Math.sin(i(C.upperAngle)),u.xEnd=h+l.settings.stateRadius*Math.cos(i(L.lowerAngle)),u.yEnd=T-l.settings.stateRadius*Math.sin(i(L.lowerAngle))}w=35,I=a(M,D),I=s(I),I=r(I,w),u.xMidCurv=I.x+u.xMid,u.yMidCurv=I.y+u.yMid;var k,R=(l.existsDrawnTransition(m.id,g.id),l.getDrawnTransition(m.id,g.id));k=R?R.names.length:1;var E,N,_=o(M,b),B=_.degree;B>90&&(B=90-B%90);var O=Math.pow(B/90,.5);E=u.approachTransition?40+8*k*O:12+8*k*O,N=a(M,D),N=s(N),N=r(N,E),u.xText=N.x+u.xMid,u.yText=N.y+u.yMid;var F=[];return F=u.approachTransition?[[u.xStart,u.yStart],[u.xMidCurv,u.yMidCurv],[u.xEnd,u.yEnd]]:[[u.xStart,u.yStart],[u.xEnd,u.yEnd]],u.path=l.bezierLine(F),u},l.writeTransitionText=function(e,a){e.selectAll("*").remove();for(var n=0;n<a.length;n++)null!==t.simulator.animated.transition&&a[n].id===t.simulator.animated.transition.id?e.append("tspan").attr("transition-id",a[n].id).text(a[n].name).classed("animated-transition-text",!0):e.append("tspan").attr("transition-id",a[n].id).text(a[n].name),n<a.length-1&&e.append("tspan").text(" | ")},l.drawTransition=function(e){var a=t.getTransitionById(e);if(!l.existsDrawnTransition(a.fromState,a.toState)){var n=l.svgTransitions.append("g").attr("class","transition"),i=(n.append("path").attr("class","transition-line-selection").attr("fill","none").attr("marker-end","url(#marker-end-arrow-selection)"),n.append("path").attr("class","transition-line").attr("fill","none").attr("marker-end","url(#marker-end-arrow)"),n.append("path").attr("class","transition-line-click").attr("stroke-width",20).attr("stroke","transparent").attr("fill","none"),n.append("path").attr("class","transition-line-hover").attr("fill","none").attr("marker-end","url(#marker-end-arrow-hover)"),n.append("text").attr("class","transition-text").attr("dominant-baseline","central").attr("fill","black"));if(a.fromState!=a.toState){var r=l.getTransitionDrawConfig(a);if(r.approachTransition){var s=l.getDrawnTransition(a.toState,a.fromState),o=l.getTransitionDrawConfig(s,!0);l.updateTransitionLines(s.objReference,o.path),s.objReference.select(".transition-text").attr("x",o.xText).attr("y",o.yText)}i.attr("class","transition-text").attr("x",r.xText).attr("y",r.yText),l.updateTransitionLines(n,r.path)}else{var c=t.getArrayStateIdByStateId(a.fromState),d=t.config.states[c].x,u=t.config.states[c].y;l.updateTransitionLines(n,l.selfTransition(d,u)),i.attr("x",d-l.settings.stateRadius-50).attr("y",u)}return n.attr("object-id",t.config.drawnTransitions.push({fromState:a.fromState,toState:a.toState,names:[{id:a.id,name:a.name}],objReference:n})-1),l.writeTransitionText(i,l.getDrawnTransition(a.fromState,a.toState).names),n.attr("from-state-id",a.fromState).attr("to-state-id",a.toState).on("click",l.openTransitionMenu).on("mouseover",function(){d3.select(this).select(".transition-line-hover").attr("style","opacity:0.6")}).on("mouseleave",function(){d3.select(this).select(".transition-line-hover").attr("style","")}),n}var f=l.getDrawnTransition(a.fromState,a.toState);f.names.push({id:a.id,name:a.name}),l.writeTransitionText(f.objReference.select(".transition-text"),l.getDrawnTransition(a.fromState,a.toState).names);var m=l.getTransitionDrawConfig(a);f.objReference.select(".transition-text").attr("x",m.xText).attr("y",m.yText)},l.updateTransitionLines=function(t,e){t.select(".transition-line").attr("d",e),t.select(".transition-line-selection").attr("d",e),t.select(".transition-line-hover").attr("d",e),t.select(".transition-line-click").attr("d",e)},l.openTransitionMenu=function(e){l.closeStateMenu(),l.closeTransitionMenu(),l.preventSvgOuterClick=!0,l.showTransitionMenu=!0;var a,n;if(void 0===e)a=d3.select(this).attr("from-state-id"),n=d3.select(this).attr("to-state-id"),l.selectedTransition=l.getDrawnTransition(a,n);else{var i=t.getTransitionById(e);a=i.fromState,n=i.toState,l.selectedTransition=l.getDrawnTransition(a,n)}l.selectedTransition.objReference.classed("active",!0),l.input={},l.input.fromState=t.getStateById(a),l.input.toState=t.getStateById(n),l.input.transitions=[],_.forEach(l.selectedTransition.names,function(t,a){var n={};n=cloneObject(t),void 0!==e?t.id==e&&(n.isFocus=!0):l.selectedTransition.names.length-1===a&&(n.isFocus=!0),n.ttt="",n.tttisopen=!1,l.input.transitions.push(n)}),l.transitionMenuListener=[];for(var r=0;r<l.input.transitions.length;r++)l.transitionMenuListener.push(t.$watchCollection("statediagram.input.transitions['"+r+"']",function(e,i){e.name!==i.name&&(e.tttisopen=!1,""===e.name||t.existsTransition(a,n,e.name)?""===e.name?(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_TOO_SHORT"):t.existsTransition(a,n,e.name,e.id)&&(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_ALREAD_EXISTS"):t.renameTransition(e.id,e.name),console.log(t.existsTransition(a,n,e.name,e.id)))}));t.safeApply()},l.closeTransitionMenu=function(){_.forEach(l.transitionMenuListener,function(t,e){t()}),l.showTransitionMenu=!1,null!==l.selectedTransition&&(l.selectedTransition.objReference.classed("active",!1),l.selectedTransition=null)},l.updateTransitionsAfterStateDrag=function(e){t.config.states[t.getArrayStateIdByStateId(e)].name,_.forEach(t.config.drawnTransitions,function(a,n){if(a.fromState==e||a.toState==e){var i=a.objReference,r=i.select("text");if(a.fromState!=a.toState){var s=l.getTransitionDrawConfig(a);l.updateTransitionLines(i,s.path),r.attr("x",s.xText).attr("y",s.yText)}else{var o=a.fromState,c=t.config.states[t.getArrayStateIdByStateId(o)].x,d=t.config.states[t.getArrayStateIdByStateId(o)].y;l.updateTransitionLines(i,l.selfTransition(c,d)),r.attr("x",c-l.settings.stateRadius-50).attr("y",d)}}})},t.$watch("simulator.animated.currentState",function(e,a){e!==a&&(console.log("CURRENTSTATE:oldValue "+a+" newvalue "+e),console.log("status"+t.simulator.status),null!==a&&(l.setStateClassAs(a,!1,"animated-currentstate-svg"),l.setStateClassAs(a,!1,"animated-accepted-svg"),l.setStateClassAs(a,!1,"animated-not-accepted-svg")),null!==e&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"):l.setStateClassAs(e,!0,"animated-currentstate-svg")))}),t.$watch("simulator.animated.transition",function(t,e){t!==e&&(null!==e&&(l.setTransitionClassAs(e.id,!1,"animated-transition"),d3.selectAll("[transition-id='"+e.id+"'").classed("animated-transition-text",!1)),null!==t&&(l.setTransitionClassAs(t.id,!0,"animated-transition"),console.log(t),d3.selectAll("[transition-id='"+t.id+"'").classed("animated-transition-text",!0)))}),t.$watch("simulator.animated.nextState",function(t,e){t!==e&&(console.log("NEXTSTATE: oldValue "+e+" newvalue "+t),null!==e&&l.setStateClassAs(e,!1,"animated-nextstate-svg"),null!==t&&l.setStateClassAs(t,!0,"animated-nextstate-svg"))}),t.$watch("simulator.status",function(e,a){e!==a&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status&&l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"))})}function StatetransitionfunctionDFA(t){"use strict";var e=this;e.functionData={},e.functionData.states=[],e.functionData.startState="",e.functionData.finalStates="",e.functionData.transitions="",e.functionData.statetransitionfunction=[],t.updateListeners.push(e),e.updateFunction=function(){var a,n="",i="",r="",s="";e.functionData.transitions=t.config.alphabet,e.functionData.states=[],_.forEach(t.config.states,function(a,i){n="";var r="";null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id&&(r="selected"),n+=a.id==t.simulator.animated.currentState&&"accepted"===t.simulator.status?'<span class="animated-accepted '+r+'">':a.id==t.simulator.animated.currentState&&"not accepted"===t.simulator.status?'<span class="animated-not-accepted '+r+'">':a.id==t.simulator.animated.currentState?'<span class="animated-currentstate '+r+'">':'<span class="'+r+'">',n+=a.name,n+="</span>",i<t.config.states.length-1&&(n+=", "),e.functionData.states.push(n)}),e.functionData.statetransitionfunction=[],_.forEach(t.config.states,function(a,n){_.forEach(t.config.transitions,function(n,r){if(n.fromState===a.id){var s=n,o=!1;null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{id:n.id})&&(o=!0);var c=!1;t.simulator.animated.transition&&t.simulator.animated.transition.id===s.id&&(c=!0),i=c||o?'(<span class=" '+(c?"animated-transition":"")+" "+(o?"selected":"")+'">':"(<span>",i+=t.getStateById(s.fromState).name+", ",i+=s.name+", ",i+=t.getStateById(s.toState).name+"</span>)",e.functionData.statetransitionfunction.push(i)}})}),a=t.getStateById(t.config.startState),void 0!==a&&(r+='<span class="">'+a.name+"</span>"),e.functionData.startState=r,_.forEach(t.config.finalStates,function(e,a){e=t.getStateById(e),s=e.name,a<t.config.finalStates.length-1&&(s+=", ")}),e.functionData.finalStates=s},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.status",function(t,a){t!==a&&e.updateFunction()})}function TableDFA(t){var e=this;e.states=[],t.updateListeners.push(e),e.updateFunction=function(){e.states=[],e.alphabet=[],t.config,_.forEach(t.config.alphabet,function(a,n){var i="";null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{name:a})&&(i="selected");var r;r=t.simulator.animated.transition&&t.simulator.animated.transition.name===a?'<span class="animated-transition '+i+'">'+a+"</span>":'<span class="'+i+'">'+a+"</span>",e.alphabet.push(r)}),_.forEach(t.config.states,function(a,n){var i={};i.id=a.id;var r="";if((null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id||null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.fromState===a.id)&&(r="selected"),t.simulator.animated.currentState==a.id){var s="";s="accepted"===t.simulator.status?"animated-accepted":"not accepted"===t.simulator.status?"animated-not-accepted":"animated-currentstate",i.name='<span class="'+s+" "+r+'">'+a.name+"</span>"}else i.name='<span class="'+r+'">'+a.name+"</span>";t.isStateAFinalState(a.id)?i.finalState=!0:i.finalState=!1,t.config.startState===a.id?i.startState=!0:i.startState=!1,i.trans=[],_.forEach(t.config.alphabet,function(e,n){var r=null;_.forEach(t.config.transitions,function(t,n){t.fromState===a.id&&t.name===e&&(r=t)});var s={};if(s.alphabet=e,null!==r){var o=t.getStateById(r.toState),c="";null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.toState===o.id&&(c="selected"),t.simulator.animated.nextState==o.id&&r.name==t.simulator.animated.transition.name?s.State='<span class="animated-nextstate '+c+'">'+o.name+"</span>":s.State='<span class="'+c+'">'+o.name+"</span>"}else s.State="";i.trans.push(s)}),e.states.push(i)})},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.nextState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()})}function SimulationDFA(t){"use strict";var e=this;e.isInPlay=!1,e.loopSimulation=!0,e.stepTimeOut=1500,e.loopTimeOut=2e3,e.simulationPaused=!1,e.simulationSettings=!0,e.currentState=null,e.nextState=null,e.transition=null,e.isInputAccepted=!1,e.settings=function(){e.simulationSettings=!e.simulationSettings},e.animated={currentState:null,transition:null,nextState:null},e.reset=function(){e.animated={currentState:null,transition:null,nextState:null},e.goneTransitions=[],e.currentState=t.config.startState,e.transition=null,e.animatedTransition=!1,e.nextState=null,e.animatedNextState=!1,e.isNextStepCalculated=!1,e.simulationStarted=!1,e.statusSequence=[t.config.startState],e.madeSteps=0,e.inputWord=t.config.inputWord,e.processedWord="",e.nextChar="",e.status="stopped"},e.pause=function(){e.simulationPaused||(e.simulationPaused=!0,e.isInPlay=!1)},e.stop=function(){e.pause(),e.reset()},e.play=function(){e.simulationPaused||(e.simulationStarted?((e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&(e.animateNextMove(),t.safeApply(function(){}),(e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&setTimeout(e.play,e.stepTimeOut)),e.isNextStepCalculated||"accepted"!=e.status||(e.loopSimulation?setTimeout(e.play,e.loopTimeOut):e.isInPlay=!1,e.simulationStarted=!1,t.safeApply(function(){}))):e.prepareSimulation())},e.prepareSimulation=function(){e.reset(),e.simulationStarted=!0,e.animated.currentState=_.last(e.statusSequence),t.safeApply(),setTimeout(e.play,e.loopTimeOut)},e.animateNextMove=function(){e.isNextStepCalculated||e.calcNextStep(),e.animatedTransition?!e.animatedNextState&&e.animatedTransition?(e.animatedNextState=!0,e.animated.nextState=e.nextState):e.animatedTransition&&e.animatedNextState&&(e.animated.transition=null,e.animated.nextState=null,e.animated.currentState=e.nextState,e.currentState=e.nextState,e.madeSteps++,e.inputWord.length==e.madeSteps&&(_.include(t.config.finalStates,e.currentState)?e.status="accepted":e.status="not accepted"),e.isNextStepCalculated=!1,e.animatedNextState=!1,e.animatedTransition=!1,e.processedWord+=e.nextChar,e.statusSequence.push(e.currentState),"accepted"!==e.status&&"not accepted"!==e.status&&e.calcNextStep()):(e.animatedTransition=!0,e.animated.transition=e.transition,e.goneTransitions.push(e.transition))},e.calcNextStep=function(){return e.isNextStepCalculated=!0,e.status="step",e.nextChar=e.inputWord[e.madeSteps],e.transition=_.filter(t.config.transitions,function(t){return void 0===e.nextChar?void(e.status="not accepted"):t.fromState==_.last(e.statusSequence)&&t.name==e.nextChar}),_.isEmpty(e.transition)?(e.transition=null,void(e.status="not accepted")):(e.transition=e.transition[0],void(e.nextState=e.transition.toState))},e.stepForward=function(){if(e.simulationPaused||e.pause(),e.simulationStarted){if(!_.include(["step","stopped","accepted","not accepted"],e.status))return void console.log(e.status);_.include(["accepted","not accepted"],e.status)||e.animateNextMove()}else e.prepareSimulation(),e.status="step"},e.stepBackward=function(){e.simulationPaused||e.pause(),_.include(["step","accepted","not accepted"],e.status)&&(e.status="step",e.animatedTransition||e.animatedNextState||0!==e.madeSteps?e.animateLastMove():e.reset())},e.animateLastMove=function(){console.log(e.animatedTransition+" "+e.animatedNextState),e.animatedTransition&&e.animatedNextState?(e.animated.nextState=null,e.animatedNextState=!1):e.animatedTransition?(e.animated.transition=null,e.animatedTransition=!1,e.goneTransitions.pop()):e.calcLastStep()},e.calcLastStep=function(){e.nextChar=e.processedWord.slice(-1),console.log(e.nextChar+" "+e.statusSequence[e.statusSequence.length-2]),e.transition=_.last(e.goneTransitions),console.log(e.transition),_.pullAt(e.goneTransitions,e.goneTransitions.length),e.animatedTransition=!0,e.animated.transition=e.transition;var t=e.currentState;e.currentState=e.transition.fromState,e.nextState=t,e.animated.nextState=e.nextState,e.animatedNextState=!0,e.animated.currentState=e.currentState,e.madeSteps--,e.statusSequence.splice(-1,1),e.processedWord=e.processedWord.slice(0,-1)},e.getNextTransition=function(e,a){for(var n=0;n<t.config.transitions.length;n++){var i=t.config.transitions[n];if(i.fromState==e&&i.name==a)return i}},e.check=function(){var a=!1,n=[];n.push(t.config.startState);for(var i="",r=0,s=null;r<=t.config.inputWord.length&&(i=t.config.inputWord[r],s=e.getNextTransition(_.last(n),i),!_.isEmpty(s));)if(n.push(s.toState),r++,t.config.inputWord.length==r){if(_.include(t.config.finalStates,_.last(n))){a=!0;break}break}return a},e.isPlayable=function(){return t.config.states.length>=1&&t.config.transitions.length>=1&&null!==t.config.startState&&t.config.finalStates.length>=1},e.playOrPause=function(){e.isPlayable()&&(e.isInPlay=!e.isInPlay,e.isInPlay?(e.simulationPaused=!1,e.play()):e.pause())},t.updateListeners.push(e),e.updateFunction=function(){e.isInputAccepted=e.check()}}function StateDiagramDFA(t,e){"use strict";function a(t,e){var a={x:t.y*e.z,y:-t.x*e.z};return a}function n(t){return t*(180/Math.PI)}function i(t){return t*(Math.PI/180)}function r(t,e){return{x:t.x*e,y:t.y*e}}function s(t){var e=1/Math.sqrt(t.x*t.x+t.y*t.y);return{x:t.x*e,y:t.y*e}}function o(t,e){var a=(t.x*e.x+t.y*e.y)/(Math.sqrt(t.x*t.x+t.y*t.y)*Math.sqrt(e.x*e.x+e.y*e.y)),i=Math.acos(a);return{val:a,rad:i,degree:n(i)}}function c(t,e){var a=t.x*e.x+t.y*e.y,n=t.x*e.y-t.y*e.x;return Math.atan2(n,a)}function d(t,e){var a=n(c(t,e));0>a&&(a+=360);var i=a+g;i>360&&(i-=360);var r=a-g;return 0>r&&(r+=360),{angle:a,lowerAngle:r,upperAngle:i}}var l=this;l.preventStateDragging=!1,l.inAddTransition=!1,l.selectedState=null,l.preventSvgOuterClick=!1,l.selectedTransition=null,l.showStateMenu=!1,l.showTransitionMenu=!1,l.selectedStateName="selectedForTransition",l.snapping=!0,l.settings={stateRadius:25,finalStateRadius:29,selected:!1};var u=40,f=18;l.stateSelfReferenceNumber=Math.sin(45*(Math.PI/180))*l.settings.stateRadius,l.existsDrawnTransition=function(e,a){for(var n=!1,i=0;i<t.config.drawnTransitions.length;i++){var r=t.config.drawnTransitions[i];r.fromState==e&&r.toState==a&&(n=!0)}return n},l.getDrawnTransition=function(e,a){for(var n=0;n<t.config.drawnTransitions.length;n++){var i=t.config.drawnTransitions[n];if(i.fromState==e&&i.toState==a)return i}},l.clearSvgContent=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgTransitions.html(""),l.svgStates.html(""),t.config.drawnTransitions=[],l.svg.attr("transform","translate("+t.defaultConfig.diagramm.x+","+t.defaultConfig.diagramm.y+") scale("+t.defaultConfig.diagramm.scale+")"),m.scale(t.defaultConfig.diagramm.scale),m.translate([t.defaultConfig.diagramm.x,t.defaultConfig.diagramm.y])},l.zoomMax=2.5,l.zoomMin=.5,l.zoomValue=.1,l.zoomIn=function(){t.config.diagramm.scale=t.config.diagramm.scale+l.zoomValue>l.zoomMax?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale+l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomOut=function(){t.config.diagramm.scale=t.config.diagramm.scale-l.zoomValue<=l.zoomMin?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale-l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomTo=function(e){console.log("zoomtedto"),t.config.diagramm.scale=e/100,t.safeApply(),l.updateZoomBehaviour()},l.updateZoomBehaviour=function(){t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")"),m.scale(t.config.diagramm.scale),m.translate([t.config.diagramm.x,t.config.diagramm.y])},l.zoomFitWindow=function(){var e,a=[],n=[],i=0,r=0,s=0,o=0,c=0,d=0,u=l.svgOuter.style("width").replace("px",""),f=l.svgOuter.style("height").replace("px","");
if(t.config.diagramm.scale=1,t.config.states.length>0){for(e=0;e<t.config.states.length;e++)a[e]=t.config.states[e].x;for(e=0;e<t.config.states.length;e++)n[e]=t.config.states[e].y;for(i=_.min(a),r=_.max(a),s=_.min(n),o=_.max(n);r-i+150>u/t.config.diagramm.scale||o-s+200>f/t.config.diagramm.scale;)t.config.diagramm.scale-=.01;t.safeApply(),c=(f/t.config.diagramm.scale-(o-s))/2,d=(u/t.config.diagramm.scale-(r-i))/2,t.config.diagramm.x=-(i*t.config.diagramm.scale)+d*t.config.diagramm.scale,t.config.diagramm.y=-(s*t.config.diagramm.scale)+c*t.config.diagramm.scale,l.updateZoomBehaviour()}else l.scaleAndTranslateToDefault()},l.scaleAndTranslateToDefault=function(){t.config.diagramm.scale=t.defaultConfig.diagramm.scale,t.config.diagramm.x=t.defaultConfig.diagramm.x,t.config.diagramm.y=t.defaultConfig.diagramm.y,t.safeApply(),l.updateZoomBehaviour()};var m=d3.behavior.zoom().scaleExtent([l.zoomMin,l.zoomMax]).on("zoom",function(){var e=d3.event.button||d3.event.ctrlKey;if(e&&d3.event.stopImmediatePropagation(),3!==d3.event.sourceEvent.which){var a=Math.floor(100*d3.event.scale)/100;t.config.diagramm.scale=a,t.config.diagramm.x=d3.event.translate[0],t.config.diagramm.y=d3.event.translate[1],t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")")}else console.log("rightclick!")});l.svgOuter=d3.select(e).call(m).on("dblclick.zoom",null).on("contextmenu",function(){d3.event.preventDefault()}),l.addSvgOuterClickListener=function(){l.svgOuter.on("click",function(){l.preventSvgOuterClick?l.preventSvgOuterClick=!1:(l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply())})},l.addSvgOuterClickListener(),l.svgGrid=l.svgOuter.append("g").attr("id","grid"),l.svg=l.svgOuter.append("g").attr("id","svg-items"),l.svgTransitions=l.svg.append("g").attr("id","transitions"),l.svgStates=l.svg.append("g").attr("id","states"),l.gridSpace=100,l.gridSnapDistance=20,l.isGrid=!0,t.$watch("[statediagram.isGrid , config.diagramm]",function(){l.drawGrid()},!0),l.drawGrid=function(){if(l.isGrid){l.svgGrid.html("");var e,a=l.svgOuter.style("width").replace("px",""),n=l.svgOuter.style("height").replace("px",""),i=1*t.config.diagramm.scale*.5,r=t.config.diagramm.x%(l.gridSpace*t.config.diagramm.scale),s=t.config.diagramm.y%(l.gridSpace*t.config.diagramm.scale);for(e=r;a>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line xgrid-line").attr("x1",e).attr("y1",0).attr("x2",e).attr("y2",n);for(e=s;n>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line ygrid-line").attr("x1",0).attr("y1",e).attr("x2",a).attr("y2",e)}else l.svgGrid.html("")},l.defs=l.svg.append("svg:defs"),l.defs.append("svg:marker").attr("id","marker-end-arrow").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-create").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-animated").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-hover").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-selection").attr("refX",4).attr("refY",3).attr("markerWidth",5).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.resetAddActions=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgOuter.on("click",null),l.inAddTransition=!1,l.inAddState=!1},l.addState=function(){l.resetAddActions(),l.svgOuter.on("mousemove",function(){l.selectedState.objReference.attr("transform","translate("+(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale)+" "+(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale)+")")}),l.selectedState=t.addStateWithPresets(-1e4,-1e4),l.selectedState.objReference.classed("state-in-creation",!0),l.svgOuter.on("click",function(){l.selectedState.objReference.classed("state-in-creation",!1),l.selectedState.x=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),l.selectedState.y=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),l.selectedState.objReference.attr("transform","translate("+l.selectedState.x+" "+l.selectedState.y+")"),l.svgOuter.on("mousemove",null),l.addSvgOuterClickListener(),l.preventSvgOuterClick=!1,t.safeApply()})},l.addTransition=function(){l.resetAddActions(),l.preventStateDragging=!0,d3.selectAll(".state").on("click",function(){if(l.mouseInState=!0,null===l.selectedState)l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.tmpTransition=l.svgTransitions.append("g").attr("class","transition"),l.tmpTransitionline=l.tmpTransition.append("path").attr("class","transition-line curvedLine in-creation").attr("marker-end","url(#marker-end-arrow-create)").attr("fill","none");else{var e=t.addTransition(l.selectedState.id,parseInt(d3.select(this).attr("object-id")),t.getNextTransitionName(l.selectedState.id));l.toggleState(l.selectedState.id,!1),l.tmpTransition.remove(),l.tmpTransition=null,l.tmpTransitionline=null,l.preventStateDragging=!1,l.addSvgOuterClickListener(),l.svgOuter.on("mousemove",null),d3.selectAll(".state").on("mouseover",null),d3.selectAll(".state").on("mouseleave",null),d3.selectAll(".state").on("click",l.openStateMenu),l.openTransitionMenu(e.id)}}),l.svgOuter.on("mousemove",function(){if(!l.mouseInState&&null!==l.selectedState){var e=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),a=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),n=l.bezierLine([[l.selectedState.x,l.selectedState.y],[e,a]]);l.tmpTransitionline.attr("d",n)}}),d3.selectAll(".state").on("mouseover",function(e){if(l.mouseInState=!0,null!==l.selectedState){var a=t.getStateById(d3.select(this).attr("object-id")),n={};n.fromState=l.selectedState.id,n.toState=a.id;var i=l.tmpTransitionline;if(l.existsDrawnTransition(l.selectedState.fromState,l.selectedState.toState)){var r=l.getDrawnTransition(n.fromState,n.toState);r.names.push(n.name),l.writeTransitionText(r.objReference.select(".transition-text"),r.names)}else if(n.fromState!=n.toState){var s=l.getTransitionDrawConfig(n);if(s.approachTransition){var o=l.getDrawnTransition(n.toState,n.fromState),c=l.getTransitionDrawConfig(o,!0);l.updateTransitionLines(o.objReference,c.path),o.objReference.select(".transition-text").attr("x",c.xText).attr("y",c.yText),l.otherTransition=o}i.attr("d",s.path)}else{var d=t.getArrayStateIdByStateId(n.fromState),u=t.config.states[d].x,f=t.config.states[d].y;i.attr("d",l.selfTransition(u,f))}l.tmpTransitionline.attr("x1",l.selectedState.x).attr("y1",l.selectedState.y).attr("x2",a.x).attr("y2",a.y)}}).on("mouseleave",function(){if(l.mouseInState=!1,null!==l.otherTransition&&void 0!==l.otherTransition){var t=l.getTransitionDrawConfig(l.otherTransition);l.updateTransitionLines(l.otherTransition.objReference,t.path),l.otherTransition.objReference.select(".transition-text").attr("x",t.xText).attr("y",t.yText)}})},l.renameState=function(e,a){var n=t.config.states[t.getArrayStateIdByStateId(e)],i=n.objReference;i.select("text").text(a)},l.removeState=function(e){l.closeStateMenu();var a=t.config.states[t.getArrayStateIdByStateId(e)],n=a.objReference;n.remove()},l.renameTransition=function(t,e,a,n){var i=l.getDrawnTransition(t,e),r=_.find(i.names,{id:a});r.name=n,l.writeTransitionText(i.objReference.select(".transition-text"),i.names)},l.removeTransition=function(e){var a=t.getTransitionById(e),n=l.getDrawnTransition(a.fromState,a.toState),i=l.getTransitionDrawConfig(a);if(l.closeTransitionMenu(),1===n.names.length){if(n.objReference.remove(),_.remove(t.config.drawnTransitions,function(t){return t==n}),i.approachTransition){var r=l.getDrawnTransition(a.toState,a.fromState),s=l.getTransitionDrawConfig(r,!1);l.updateTransitionLines(r.objReference,s.path),r.objReference.select(".transition-text").attr("x",s.xText).attr("y",s.yText),l.otherTransition=r}}else _.remove(n.names,function(t){return t.id==a.id}),l.writeTransitionText(n.objReference.select(".transition-text"),n.names),i=l.getTransitionDrawConfig(a),n.objReference.select(".transition-text").attr("x",i.xText).attr("y",i.yText),console.log(n),l.openTransitionMenu(n.names[n.names.length-1].id)},l.addFinalState=function(e){var a=t.getStateById(e);a.objReference.insert("circle",".state-circle").attr("class","final-state").attr("r",l.settings.finalStateRadius)},l.removeFinalState=function(e){var a=t.getStateById(e);a.objReference.select(".final-state").remove()},l.changeStartState=function(e){if(null!==t.config.startState){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove()}var n=t.getStateById(e);n.objReference.append("line").attr("class","transition-line start-line").attr("x1",0).attr("y1",-75).attr("x2",0).attr("y2",0-l.settings.stateRadius-4).attr("marker-end","url(#marker-end-arrow)")},l.removeStartState=function(e){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove(),t.config.startState=null,t.updateListener()},l.drawState=function(e){var a=t.getStateById(e),n=l.svgStates.append("g").attr("transform","translate("+a.x+" "+a.y+")").attr("class","state state-"+a.id).attr("object-id",a.id);n.append("circle").attr("class","state-circle").attr("r",l.settings.stateRadius),n.append("circle").attr("class","state-circle hover-circle").attr("r",l.settings.stateRadius),n.append("text").text(a.name).attr("class","state-text").attr("dominant-baseline","central").attr("text-anchor","middle");return a.objReference=n,n.on("click",l.openStateMenu).call(l.dragState),n},l.setStateClassAs=function(e,a,n){var i=t.getStateById(e).objReference;i.classed(n,a)},l.setTransitionClassAs=function(e,a,n){var i=t.getTransitionById(e),r=l.getDrawnTransition(i.fromState,i.toState).objReference;r.classed(n,a),a&&"animated-transition"==n?r.select(".transition-line").attr("marker-end","url(#marker-end-arrow-animated)"):r.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.setArrowMarkerTo=function(t,e){""!==e?t.select(".transition-line").attr("marker-end","url(#marker-end-arrow-"+e+")"):t.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.openStateMenu=function(){console.log("open state menu"),l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply(),l.preventSvgOuterClick=!0,l.showStateMenu=!0,l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.input={},l.input.state=l.selectedState,l.input.stateName=l.selectedState.name,l.input.startState=t.config.startState==l.selectedState.id,l.input.finalState=t.isStateAFinalState(l.selectedState.id),l.input.ttt="",l.input.tttisopen=!1,t.safeApply(),l.stateMenuListener=[],l.stateMenuListener.push(t.$watch("statediagram.input.startState",function(e,a){e!==a&&(l.input.startState?t.changeStartState(l.input.state.id):l.selectedState.id==t.config.startState&&t.removeStartState())})),l.stateMenuListener.push(t.$watch("statediagram.input.finalState",function(e,a){e!==a&&(l.input.finalState?t.addFinalState(l.input.state.id):t.removeFinalState(l.input.state.id))})),l.stateMenuListener.push(t.$watch("statediagram.input.stateName",function(e,a){if(l.input.tttisopen=!1,e!==a)if(""===e||t.existsStateWithName(e))""===e?(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_TOO_SHORT"):t.existsStateWithName(e,l.input.state.id)&&(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_ALREADY_EXIST");else{!t.renameState(l.input.state.id,e)}}))},l.closeStateMenu=function(){_.forEach(l.stateMenuListener,function(t,e){t()}),null!==l.selectedState&&l.toggleState(l.selectedState.id,!1),l.stateMenuListener=null,l.showStateMenu=!1,l.input=null},l.toggleState=function(t,e){l.setStateClassAs(t,e,"active"),e===!1&&(l.selectedState=null)},l.dragState=d3.behavior.drag().on("dragstart",function(){l.dragAmount=0,d3.event.sourceEvent.stopPropagation()}).on("drag",function(){if(1==d3.event.sourceEvent.which&&!l.preventStateDragging){l.dragAmount++;var e=d3.event.x,a=d3.event.y;if(l.snapping){var n=e-e%l.gridSpace,i=a-a%l.gridSpace;e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n,a=i):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n+l.gridSpace,a=i):e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance?(e=n,a=i+l.gridSpace):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance&&(e=n+l.gridSpace,a=i+l.gridSpace)}if(l.dragAmount>1){d3.select(this).attr("transform","translate("+e+" "+a+")");var r=d3.select(this).attr("object-id"),s=t.getStateById(r);s.x=e,s.y=a,l.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"))}}}).on("dragend",function(){l.dragAmount>1&&t.safeApply()}),l.selfTransition=function(t,e){return l.bezierLine([[t-l.stateSelfReferenceNumber,e-l.stateSelfReferenceNumber],[t-l.stateSelfReferenceNumber-u,e-l.stateSelfReferenceNumber-f],[t-l.stateSelfReferenceNumber-u,e+l.stateSelfReferenceNumber+f],[t-l.stateSelfReferenceNumber,e+l.stateSelfReferenceNumber]])};var g=30;l.bezierLine=d3.svg.line().x(function(t){return t[0]}).y(function(t){return t[1]}).interpolate("basis"),l.getTransitionDrawConfig=function(e,n){var c=3,u={};u.approachTransition=n||l.existsDrawnTransition(e.toState,e.fromState);var f,m=t.getStateById(e.fromState),g=t.getStateById(e.toState),S=t.isStateAFinalState(e.toState),p=m.x,v=m.y,h=g.x,T=g.y,x={x:h-p,y:T-v},y=Math.sqrt(x.x*x.x+x.y*x.y),A=l.settings.stateRadius/y;f=S?(l.settings.stateRadius+c+5)/y:(l.settings.stateRadius+c)/y,u.xStart=p+A*x.x,u.yStart=v+A*x.y,u.xEnd=h-f*x.x,u.yEnd=T-f*x.y,u.xDiff=h-p,u.yDiff=T-v,u.xMid=(p+h)/2,u.yMid=(v+T)/2,u.distance=Math.sqrt(u.xDiff*u.xDiff+u.yDiff*u.yDiff);var w,I,M={x:u.xMid-u.xStart,y:u.yMid-u.yStart,z:0},D={x:0,y:0,z:1},b={x:1,y:0,z:0};if(w=20,I=a(M,D),I=s(I),I=r(I,w),u.approachTransition){var C=d({x:u.xStart-p,y:u.yStart-v},{x:l.settings.stateRadius,y:0}),L=d({x:u.xEnd-h,y:u.yEnd-T},{x:l.settings.stateRadius,y:0});u.xStart=p+l.settings.stateRadius*Math.cos(i(C.upperAngle)),u.yStart=v-l.settings.stateRadius*Math.sin(i(C.upperAngle)),u.xEnd=h+l.settings.stateRadius*Math.cos(i(L.lowerAngle)),u.yEnd=T-l.settings.stateRadius*Math.sin(i(L.lowerAngle))}w=35,I=a(M,D),I=s(I),I=r(I,w),u.xMidCurv=I.x+u.xMid,u.yMidCurv=I.y+u.yMid;var k,R=(l.existsDrawnTransition(m.id,g.id),l.getDrawnTransition(m.id,g.id));k=R?R.names.length:1;var E,N,_=o(M,b),B=_.degree;B>90&&(B=90-B%90);var O=Math.pow(B/90,.5);E=u.approachTransition?40+8*k*O:12+8*k*O,N=a(M,D),N=s(N),N=r(N,E),u.xText=N.x+u.xMid,u.yText=N.y+u.yMid;var F=[];return F=u.approachTransition?[[u.xStart,u.yStart],[u.xMidCurv,u.yMidCurv],[u.xEnd,u.yEnd]]:[[u.xStart,u.yStart],[u.xEnd,u.yEnd]],u.path=l.bezierLine(F),u},l.writeTransitionText=function(e,a){e.selectAll("*").remove();for(var n=0;n<a.length;n++)null!==t.simulator.animated.transition&&a[n].id===t.simulator.animated.transition.id?e.append("tspan").attr("transition-id",a[n].id).text(a[n].name).classed("animated-transition-text",!0):e.append("tspan").attr("transition-id",a[n].id).text(a[n].name),n<a.length-1&&e.append("tspan").text(" | ")},l.drawTransition=function(e){var a=t.getTransitionById(e);if(!l.existsDrawnTransition(a.fromState,a.toState)){var n=l.svgTransitions.append("g").attr("class","transition"),i=(n.append("path").attr("class","transition-line-selection").attr("fill","none").attr("marker-end","url(#marker-end-arrow-selection)"),n.append("path").attr("class","transition-line").attr("fill","none").attr("marker-end","url(#marker-end-arrow)"),n.append("path").attr("class","transition-line-click").attr("stroke-width",20).attr("stroke","transparent").attr("fill","none"),n.append("path").attr("class","transition-line-hover").attr("fill","none").attr("marker-end","url(#marker-end-arrow-hover)"),n.append("text").attr("class","transition-text").attr("dominant-baseline","central").attr("fill","black"));if(a.fromState!=a.toState){var r=l.getTransitionDrawConfig(a);if(r.approachTransition){var s=l.getDrawnTransition(a.toState,a.fromState),o=l.getTransitionDrawConfig(s,!0);l.updateTransitionLines(s.objReference,o.path),s.objReference.select(".transition-text").attr("x",o.xText).attr("y",o.yText)}i.attr("class","transition-text").attr("x",r.xText).attr("y",r.yText),l.updateTransitionLines(n,r.path)}else{var c=t.getArrayStateIdByStateId(a.fromState),d=t.config.states[c].x,u=t.config.states[c].y;l.updateTransitionLines(n,l.selfTransition(d,u)),i.attr("x",d-l.settings.stateRadius-50).attr("y",u)}return n.attr("object-id",t.config.drawnTransitions.push({fromState:a.fromState,toState:a.toState,names:[{id:a.id,name:a.name}],objReference:n})-1),l.writeTransitionText(i,l.getDrawnTransition(a.fromState,a.toState).names),n.attr("from-state-id",a.fromState).attr("to-state-id",a.toState).on("click",l.openTransitionMenu).on("mouseover",function(){d3.select(this).select(".transition-line-hover").attr("style","opacity:0.6")}).on("mouseleave",function(){d3.select(this).select(".transition-line-hover").attr("style","")}),n}var f=l.getDrawnTransition(a.fromState,a.toState);f.names.push({id:a.id,name:a.name}),l.writeTransitionText(f.objReference.select(".transition-text"),l.getDrawnTransition(a.fromState,a.toState).names);var m=l.getTransitionDrawConfig(a);f.objReference.select(".transition-text").attr("x",m.xText).attr("y",m.yText)},l.updateTransitionLines=function(t,e){t.select(".transition-line").attr("d",e),t.select(".transition-line-selection").attr("d",e),t.select(".transition-line-hover").attr("d",e),t.select(".transition-line-click").attr("d",e)},l.openTransitionMenu=function(e){l.closeStateMenu(),l.closeTransitionMenu(),l.preventSvgOuterClick=!0,l.showTransitionMenu=!0;var a,n;if(void 0===e)a=d3.select(this).attr("from-state-id"),n=d3.select(this).attr("to-state-id"),l.selectedTransition=l.getDrawnTransition(a,n);else{var i=t.getTransitionById(e);a=i.fromState,n=i.toState,l.selectedTransition=l.getDrawnTransition(a,n)}l.selectedTransition.objReference.classed("active",!0),l.input={},l.input.fromState=t.getStateById(a),l.input.toState=t.getStateById(n),l.input.transitions=[],_.forEach(l.selectedTransition.names,function(t,a){var n={};n=cloneObject(t),void 0!==e?t.id==e&&(n.isFocus=!0):l.selectedTransition.names.length-1===a&&(n.isFocus=!0),n.ttt="",n.tttisopen=!1,l.input.transitions.push(n)}),l.transitionMenuListener=[];for(var r=0;r<l.input.transitions.length;r++)l.transitionMenuListener.push(t.$watchCollection("statediagram.input.transitions['"+r+"']",function(e,i){e.name!==i.name&&(e.tttisopen=!1,""===e.name||t.existsTransition(a,n,e.name)?""===e.name?(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_TOO_SHORT"):t.existsTransition(a,n,e.name,e.id)&&(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_ALREAD_EXISTS"):t.renameTransition(e.id,e.name),console.log(t.existsTransition(a,n,e.name,e.id)))}));t.safeApply()},l.closeTransitionMenu=function(){_.forEach(l.transitionMenuListener,function(t,e){t()}),l.showTransitionMenu=!1,null!==l.selectedTransition&&(l.selectedTransition.objReference.classed("active",!1),l.selectedTransition=null)},l.updateTransitionsAfterStateDrag=function(e){t.config.states[t.getArrayStateIdByStateId(e)].name;_.forEach(t.config.drawnTransitions,function(a,n){if(a.fromState==e||a.toState==e){var i=a.objReference,r=i.select("text");if(a.fromState!=a.toState){var s=l.getTransitionDrawConfig(a);l.updateTransitionLines(i,s.path),r.attr("x",s.xText).attr("y",s.yText)}else{var o=a.fromState,c=t.config.states[t.getArrayStateIdByStateId(o)].x,d=t.config.states[t.getArrayStateIdByStateId(o)].y;l.updateTransitionLines(i,l.selfTransition(c,d)),r.attr("x",c-l.settings.stateRadius-50).attr("y",d)}}})},t.$watch("simulator.animated.currentState",function(e,a){e!==a&&(console.log("CURRENTSTATE:oldValue "+a+" newvalue "+e),console.log("status"+t.simulator.status),null!==a&&(l.setStateClassAs(a,!1,"animated-currentstate-svg"),l.setStateClassAs(a,!1,"animated-accepted-svg"),l.setStateClassAs(a,!1,"animated-not-accepted-svg")),null!==e&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"):l.setStateClassAs(e,!0,"animated-currentstate-svg")))}),t.$watch("simulator.animated.transition",function(t,e){t!==e&&(null!==e&&(l.setTransitionClassAs(e.id,!1,"animated-transition"),d3.selectAll("[transition-id='"+e.id+"'").classed("animated-transition-text",!1)),null!==t&&(l.setTransitionClassAs(t.id,!0,"animated-transition"),console.log(t),d3.selectAll("[transition-id='"+t.id+"'").classed("animated-transition-text",!0)))}),t.$watch("simulator.animated.nextState",function(t,e){t!==e&&(console.log("NEXTSTATE: oldValue "+e+" newvalue "+t),null!==e&&l.setStateClassAs(e,!1,"animated-nextstate-svg"),null!==t&&l.setStateClassAs(t,!0,"animated-nextstate-svg"))}),t.$watch("simulator.status",function(e,a){e!==a&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status&&l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"))})}function StatetransitionfunctionDFA(t){"use strict";var e=this;e.functionData={},e.functionData.states=[],e.functionData.startState="",e.functionData.finalStates="",e.functionData.transitions="",e.functionData.statetransitionfunction=[],t.updateListeners.push(e),e.updateFunction=function(){var a,n="",i="",r="",s="";e.functionData.transitions=t.config.alphabet,e.functionData.states=[],_.forEach(t.config.states,function(a,i){n="";var r="";null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id&&(r="selected"),n+=a.id==t.simulator.animated.currentState&&"accepted"===t.simulator.status?'<span class="animated-accepted '+r+'">':a.id==t.simulator.animated.currentState&&"not accepted"===t.simulator.status?'<span class="animated-not-accepted '+r+'">':a.id==t.simulator.animated.currentState?'<span class="animated-currentstate '+r+'">':'<span class="'+r+'">',n+=a.name,n+="</span>",i<t.config.states.length-1&&(n+=", "),e.functionData.states.push(n)}),e.functionData.statetransitionfunction=[],_.forEach(t.config.states,function(a,n){_.forEach(t.config.transitions,function(n,r){if(n.fromState===a.id){var s=n,o=!1;null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{id:n.id})&&(o=!0);var c=!1;t.simulator.animated.transition&&t.simulator.animated.transition.id===s.id&&(c=!0),i=c||o?'(<span class=" '+(c?"animated-transition":"")+" "+(o?"selected":"")+'">':"(<span>",i+=t.getStateById(s.fromState).name+", ",i+=s.name+", ",i+=t.getStateById(s.toState).name+"</span>)",e.functionData.statetransitionfunction.push(i)}})}),a=t.getStateById(t.config.startState),void 0!==a&&(r+='<span class="">'+a.name+"</span>"),e.functionData.startState=r,_.forEach(t.config.finalStates,function(e,a){e=t.getStateById(e),s=e.name,a<t.config.finalStates.length-1&&(s+=", ")}),e.functionData.finalStates=s},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.status",function(t,a){t!==a&&e.updateFunction()})}function TableDFA(t){var e=this;e.states=[],t.updateListeners.push(e),e.updateFunction=function(){e.states=[],e.alphabet=[];t.config;_.forEach(t.config.alphabet,function(a,n){var i="";null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{name:a})&&(i="selected");var r;r=t.simulator.animated.transition&&t.simulator.animated.transition.name===a?'<span class="animated-transition '+i+'">'+a+"</span>":'<span class="'+i+'">'+a+"</span>",e.alphabet.push(r)}),_.forEach(t.config.states,function(a,n){var i={};i.id=a.id;var r="";if((null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id||null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.fromState===a.id)&&(r="selected"),t.simulator.animated.currentState==a.id){var s="";s="accepted"===t.simulator.status?"animated-accepted":"not accepted"===t.simulator.status?"animated-not-accepted":"animated-currentstate",i.name='<span class="'+s+" "+r+'">'+a.name+"</span>"}else i.name='<span class="'+r+'">'+a.name+"</span>";t.isStateAFinalState(a.id)?i.finalState=!0:i.finalState=!1,t.config.startState===a.id?i.startState=!0:i.startState=!1,i.trans=[],_.forEach(t.config.alphabet,function(e,n){var r=null;_.forEach(t.config.transitions,function(t,n){t.fromState===a.id&&t.name===e&&(r=t)});var s={};if(s.alphabet=e,null!==r){var o=t.getStateById(r.toState),c="";null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.toState===o.id&&(c="selected"),t.simulator.animated.nextState==o.id&&r.name==t.simulator.animated.transition.name?s.State='<span class="animated-nextstate '+c+'">'+o.name+"</span>":s.State='<span class="'+c+'">'+o.name+"</span>"}else s.State="";i.trans.push(s)}),e.states.push(i)})},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.nextState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()})}
//Simulator for the simulation of the automata
function SimulationDFA($scope) {
    "use strict";
    var self = this;

    //saves if the animation is in playmode
    self.isInPlay = false;
    //if the simulation loops (start at the end again)
    self.loopSimulation = true;
    //time between the steps
    self.stepTimeOut = 1500;
    //Time between loops when the animation restarts
    self.loopTimeOut = 2000;
    //if the simulation is paused
    self.simulationPaused = false;
    //simulationsettings
    self.simulationSettings = true;

    //
    self.currentState = null;
    self.nextState = null;
    self.transition = null;


    //
    self.isInputAccepted = false;

    self.settings = function () {
        self.simulationSettings = !self.simulationSettings;
    };
    self.animated = {
        currentState: null,
        transition: null,
        nextState: null
    };

    /**
     * Should reset the simulation
     */
    self.reset = function () {
        //reset animation
        self.animated = {
            currentState: null,
            transition: null,
            nextState: null
        };
        //stack of the gone transitions
        self.goneTransitions = [];
        //Animation Settings
        //saves the currentStateId -> for animating
        self.currentState = $scope.config.startState;
        //saves the nextTransition for animating
        self.transition = null;
        //saves if the transition is animated
        self.animatedTransition = false;
        //saves the nextState for animating
        self.nextState = null;
        //saves if the nextState is animated
        self.animatedNextState = false;
        //saves if we already calculated the next step
        self.isNextStepCalculated = false;
        //saves if the simulationStarted
        self.simulationStarted = false;

        //Simulation Settings
        //saves the States we gone through
        self.statusSequence = [$scope.config.startState];
        //saves the steps we made T.
        self.madeSteps = 0;
        //the word we want to check
        self.inputWord = $scope.config.inputWord;
        //the word we already checked
        self.processedWord = '';
        //the char we checked at the step
        self.nextChar = '';
        //the status is stopped at when resetted
        self.status = 'stopped';
    };

    /**
     * Pause the simulation
     */
    self.pause = function () {
        if (!self.simulationPaused) {
            self.simulationPaused = true;
            self.isInPlay = false;
        }
    };

    /**
     * Stops the simulation
     */
    self.stop = function () {
        self.pause();
        self.reset();
    };

    /**
     * Play the simulation
     */
    self.play = function () {

        //if the simulation is paused then return
        if (!self.simulationPaused) {
            //start and prepare for the play
            if (!self.simulationStarted) {
                self.prepareSimulation();
            } else {
                //loop through the steps
                if (self.isNextStepCalculated || ((self.status != 'accepted') && (self.status != 'not accepted'))) {
                    self.animateNextMove();
                    $scope.safeApply(function () {});
                    if (self.isNextStepCalculated || ((self.status != 'accepted') && (self.status != 'not accepted'))) {
                        setTimeout(self.play, self.stepTimeOut);
                    }
                }
                //end the animation & reset it if loop through is activated the animation loop throuh play
                if (!self.isNextStepCalculated && self.status == 'accepted') {
                    if (self.loopSimulation) {
                        setTimeout(self.play, self.loopTimeOut);
                        //finish the Animation
                    } else {
                        self.isInPlay = false;
                    }
                    self.simulationStarted = false;
                    $scope.safeApply(function () {});
                }
            }
        } else {
            return;
        }
    };

    /**
     * Prepare the simulation ( set startSettings)
     */
    self.prepareSimulation = function () {
        //The simulation always resets the parameters at the start -> it also sets the inputWord
        self.reset();
        self.simulationStarted = true;
        self.animated.currentState = _.last(self.statusSequence);

        $scope.safeApply();
        setTimeout(self.play, self.loopTimeOut);
    };

    /**
     * animate the next Move (a step has more than three moves)
     */
    self.animateNextMove = function () {
        if (!self.isNextStepCalculated) {
            self.calcNextStep();
        }

        //First: Paint the transition & wait
        if (!self.animatedTransition) {
            self.animatedTransition = true;
            self.animated.transition = self.transition;
            self.goneTransitions.push(self.transition);

            //Second: Paint the nextstate & wait
        } else if (!self.animatedNextState && self.animatedTransition) {
            self.animatedNextState = true;
            self.animated.nextState = self.nextState;


            //Third: clear transition & currentStatecolor and set currentState = nexsttate and wait
        } else if (self.animatedTransition && self.animatedNextState) {
            self.animated.transition = null;
            self.animated.nextState = null;
            self.animated.currentState = self.nextState;

            self.currentState = self.nextState;
            //after the step was animated it adds a step to the madeSteps
            self.madeSteps++;
            //if the nextState is the finalState
            if (self.inputWord.length == self.madeSteps) {
                if (_.include($scope.config.finalStates, self.currentState)) {
                    self.status = 'accepted';
                } else {
                    self.status = 'not accepted';
                }
            }



            //Reset the step & start the next step
            self.isNextStepCalculated = false;
            self.animatedNextState = false;
            self.animatedTransition = false;
            self.processedWord += self.nextChar;

            //push the currentState to the statusSequence
            self.statusSequence.push(self.currentState);

            //check if there is a next transition
            if (self.status !== "accepted" && self.status !== "not accepted")
                self.calcNextStep();
        }

    };

    /**
     * calcs the next step
     */
    self.calcNextStep = function () {
        self.isNextStepCalculated = true;
        self.status = 'step';
        self.nextChar = self.inputWord[self.madeSteps];

        //get the next transition
        self.transition = _.filter($scope.config.transitions, function (transition) {
            //if there is no next char then the word is not accepted
            if (self.nextChar === undefined) {
                self.status = 'not accepted';
                return;
            }
            //get the nextState
            return transition.fromState == _.last(self.statusSequence) && transition.name == self.nextChar;
        });
        //if there is no next transition, then the word is not accepted
        if (_.isEmpty(self.transition)) {
            self.transition = null;
            self.status = 'not accepted';
            return;
        }
        //save transition and nextState for the animation
        self.transition = self.transition[0];
        self.nextState = self.transition.toState;
    };

    /**
     * pause the simulation and then stepForward steps to the nextAnimation ( not a whole step)
     */
    self.stepForward = function () {
        if (!self.simulationPaused) {
            self.pause();
        }
        if (!self.simulationStarted) {
            self.prepareSimulation();
            self.status = 'step';
            // return if automat is not running
        } else if (!(_.include(['step', 'stopped', 'accepted', 'not accepted'], self.status))) {
            //TODO:DEBUG
            console.log(self.status);
            return;
        } else if (!_.include(['accepted', 'not accepted'], self.status)) {
            self.animateNextMove();
        }
    };


    /**
     * pause the simulation and then steps back to the lastAnimation ( not a whole step)
     * @return {[type]} [description]
     */
    self.stepBackward = function () {
        if (!self.simulationPaused) {
            self.pause();
        }
        // return if automat is not running
        if (!(_.include(['step', 'accepted', 'not accepted'], self.status))) {
            //TODO:DEBUG
            return;
        }
        self.status = 'step';

        // Reset if no more undoing is impossible n-> not right at the moment
        if (!self.animatedTransition && !self.animatedNextState && self.madeSteps === 0) {
            self.reset();
        } else {
            // Decrease count and remove last element from statusSequence
            self.animateLastMove();
        }
    };

    /**
     * animates the last move if there is no lastmove, then calcLastStep
     * @return {[type]} [description]
     */
    self.animateLastMove = function () {
        console.log(self.animatedTransition + " " + self.animatedNextState);
        if (self.animatedTransition && self.animatedNextState) {
            self.animated.nextState = null;
            self.animatedNextState = false;
        } else if (self.animatedTransition) {
            self.animated.transition = null;
            self.animatedTransition = false;
            self.goneTransitions.pop();
        } else {
            self.calcLastStep();
        }

    };

    /**
     * calc the last step
     */
    self.calcLastStep = function () {
        self.nextChar = self.processedWord.slice(-1);
        console.log(self.nextChar + " " + self.statusSequence[self.statusSequence.length - 2]);

        //get the gone way back
        self.transition = _.last(self.goneTransitions);
        console.log(self.transition);
        _.pullAt(self.goneTransitions, self.goneTransitions.length);
        //First: Paint the transition & wait
        self.animatedTransition = true;
        self.animated.transition = self.transition;
        var tmp = self.currentState;
        self.currentState = self.transition.fromState;
        self.nextState = tmp;
        self.animated.nextState = self.nextState;
        //Second: Paint the nextstate & wait
        self.animatedNextState = true;

        self.animated.currentState = self.currentState;
        self.madeSteps--;
        self.statusSequence.splice(-1, 1);
        self.processedWord = self.processedWord.slice(0, -1);
    };

    self.getNextTransition = function (fromState, transitonName) {
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var transition = $scope.config.transitions[i];
            if (transition.fromState == fromState && transition.name == transitonName) {
                return transition;
            }
        }
        return undefined;
    };
    /**
     * checks if a word is accepted from the automata
     * @return {Boolean} [description]
     */
    self.check = function () {
        //init needed variables
        var accepted = false;
        var statusSequence = [];
        statusSequence.push($scope.config.startState);
        var nextChar = '';
        var madeSteps = 0;
        var transition = null;

        while (madeSteps <= $scope.config.inputWord.length) {
            nextChar = $scope.config.inputWord[madeSteps];
            //get the next transition
            transition = self.getNextTransition(_.last(statusSequence), nextChar);
            //if there is no next transition, then the word is not accepted
            if (_.isEmpty(transition)) {
                break;
            }
            //push the new State to the sequence
            statusSequence.push(transition.toState);
            madeSteps++;
            //if outmadeSteps is equal to the length of the inputWord 
            //and our currenState is a finalState then the inputWord is accepted, if not its not accepted
            if ($scope.config.inputWord.length == madeSteps) {
                if (_.include($scope.config.finalStates, _.last(statusSequence))) {
                    accepted = true;
                    break;
                } else {
                    break;
                }
            }
        }
        return accepted;
    };


    //BUTTONS NEED DIRECTIVES
    /**
     *  Checks if the automata is playable ( has min. 1 states and 1 transition and automat has a start and a finalstate)
     * @return {Boolean} [description]
     */
    self.isPlayable = function () {
        return $scope.config.states.length >= 1 && $scope.config.transitions.length >= 1 && $scope.config.startState !== null && $scope.config.finalStates.length >= 1;
    };

    /**
     * [playOrPause description]
     * @return {[type]} [description]
     */
    self.playOrPause = function () {
        //the automat needs to be playable
        if (self.isPlayable()) {
            //change the icon and the state to Play or Pause
            self.isInPlay = !self.isInPlay;
            if (self.isInPlay) {
                self.simulationPaused = false;
                self.play();
            } else {
                self.pause();
            }

        } else {
            //$scope.dbug.debugDanger("Kein Automat vorhanden!");
        }

    };

    $scope.updateListeners.push(self);
    self.updateFunction = function () {
        self.isInputAccepted = self.check();
    };




}
//statediagram for the svg diagramm
function StateDiagramDFA($scope, svgSelector) {
    "use strict";

    var self = this;

    self.preventStateDragging = false;
    self.inAddTransition = false;
    self.selectedState = null;

    //prevents call from the svouterclicklistener
    self.preventSvgOuterClick = false;
    self.selectedTransition = null;
    self.showStateMenu = false;
    self.showTransitionMenu = false;
    self.selectedStateName = "selectedForTransition";
    //user can snap the states to the grid -> toggles snapping
    self.snapping = true;

    //statediagram settings
    self.settings = {
        stateRadius: 25,
        finalStateRadius: 29,
        selected: false
    };
    //is for the selfReference
    var stretchX = 40;
    var stretchY = 18;

    //for the selfReference transition
    self.stateSelfReferenceNumber = Math.sin(45 * (Math.PI / 180)) * self.settings.stateRadius;

    /**
     * Check if transition already drawn
     * @param   {number}  fromState 
     * @param   {number}  toState   
     * @returns {boolean}
     */
    self.existsDrawnTransition = function (fromState, toState) {

        var tmp = false;
        for (var i = 0; i < $scope.config.drawnTransitions.length; i++) {
            var transition = $scope.config.drawnTransitions[i];
            if (transition.fromState == fromState && transition.toState == toState) {
                tmp = true;
            }
        }
        return tmp;
    };

    /**
     * Get a drawn Transition
     * @param   {number} fromState 
     * @param   {number} toState   
     * @returns {object} 
     */
    self.getDrawnTransition = function (fromState, toState) {
        for (var i = 0; i < $scope.config.drawnTransitions.length; i++) {
            var transition = $scope.config.drawnTransitions[i];
            if (transition.fromState == fromState && transition.toState == toState) {
                return transition;
            }
        }
        return undefined;
    };

    /**
     * Clears the svgContent, resets scale and translate and delete drawnTransitionContent
     */
    self.clearSvgContent = function () {
        //first close Menus
        self.closeStateMenu();
        self.closeTransitionMenu();
        //Clear the content of the svg
        self.svgTransitions.html("");
        self.svgStates.html("");
        $scope.config.drawnTransitions = [];
        //change the scale and the translate to the defaultConfit
        self.svg.attr("transform", "translate(" + $scope.defaultConfig.diagramm.x + "," + $scope.defaultConfig.diagramm.y + ")" + " scale(" + $scope.defaultConfig.diagramm.scale + ")");
        svgOuterZoomAndDrag.scale($scope.defaultConfig.diagramm.scale);
        svgOuterZoomAndDrag.translate([$scope.defaultConfig.diagramm.x, $scope.defaultConfig.diagramm.y]);

    };

    /****ZOOMHANDLER START***/
    //amount the user can zoom out
    self.zoomMax = 2.5;
    //amount the user can zoom in
    self.zoomMin = 0.5;
    self.zoomValue = 0.1;

    self.zoomIn = function () {
        $scope.config.diagramm.scale = ($scope.config.diagramm.scale + self.zoomValue) > self.zoomMax ? $scope.config.diagramm.scale : Math.floor(($scope.config.diagramm.scale + self.zoomValue) * 100) / 100;
        self.updateZoomBehaviour();
    };
    self.zoomOut = function () {

        $scope.config.diagramm.scale = ($scope.config.diagramm.scale - self.zoomValue) <= self.zoomMin ? $scope.config.diagramm.scale : Math.floor(($scope.config.diagramm.scale - self.zoomValue) * 100) / 100;
        self.updateZoomBehaviour();

    };

    /**
     * This method zooms the svg to a specific scale
     * @param {number} value the zoom value
     */
    self.zoomTo = function (value) {
        console.log("zoomtedto");
        $scope.config.diagramm.scale = value / 100;
        $scope.safeApply();
        self.updateZoomBehaviour();
    };

    /**
     * This method updates the d3 zoombehaviour (fixes weird bugs)
     */
    self.updateZoomBehaviour = function () {
        $scope.safeApply();
        self.svg.attr("transform", "translate(" + $scope.config.diagramm.x + "," + $scope.config.diagramm.y + ")" + " scale(" + $scope.config.diagramm.scale + ")");
        svgOuterZoomAndDrag.scale($scope.config.diagramm.scale);
        svgOuterZoomAndDrag.translate([$scope.config.diagramm.x, $scope.config.diagramm.y]);
    };

    /**
     * This method zooms the svg to a calculated scale, so the complete svg fits in the window
     */
    self.zoomFitWindow = function () {
        var stateXCoor = [];
        var stateYCoor = [];
        var minX = 0;
        var maxX = 0;
        var minY = 0;
        var maxY = 0;
        var topShifting = 0;
        var leftShifting = 0;
        var i;
        var obj;
        var width = self.svgOuter.style("width").replace("px", "");
        var height = self.svgOuter.style("height").replace("px", "");

        /*
         * set the diagrammscale on 100%. We got the advantage, that the method also zoom in, if the automaton doesn't fit the window. 
         * But the method doesn't really zoom in. It sets the scale on 100% an then zoom out.
         */
        $scope.config.diagramm.scale = 1.0;

        /**
         * check if there exist at least one state. If the diagram is empty, there is nothing to fit the window.
         * The state with the lowest x- and y-coordinate defines the minimum-x- and minimum-y-coordinate from the automaton.
         * The state with the highest x- and y-coordinate defines the maximum-x- and maximum-y-coordiante from the automaten
         */

        if ($scope.config.states.length > 0) {
            for (i = 0; i < $scope.config.states.length; i++) {
                stateXCoor[i] = $scope.config.states[i].x;
            }

            for (i = 0; i < $scope.config.states.length; i++) {
                stateYCoor[i] = $scope.config.states[i].y;
            }
            minX = _.min(stateXCoor);
            maxX = _.max(stateXCoor);
            minY = _.min(stateYCoor);
            maxY = _.max(stateYCoor);

            /* 
             * While the size of the automaton is bigger than the diagram, zoom out. 
             * We work with the width and the height from the diagram proportional to the scale.
             */
            while (((maxX - minX + 150) > (width / $scope.config.diagramm.scale)) || ((maxY - minY + 200) > (height / $scope.config.diagramm.scale))) {
                $scope.config.diagramm.scale -= 0.01;
            }
            $scope.safeApply();

            //Calculation of a topshifting and a leftshifting, so the automaton is centered in the diagram.
            topShifting = (((height / $scope.config.diagramm.scale) - (maxY - minY)) / 2);
            leftShifting = (((width / $scope.config.diagramm.scale) - (maxX - minX)) / 2);

            //set the diagram-x and -y values and update the diagram.
            $scope.config.diagramm.x = -(minX * $scope.config.diagramm.scale) + (leftShifting * $scope.config.diagramm.scale);
            $scope.config.diagramm.y = -(minY * $scope.config.diagramm.scale) + (topShifting * $scope.config.diagramm.scale);
            self.updateZoomBehaviour();
        } else {
            self.scaleAndTranslateToDefault();
        }
    };

    /**
     * Scale and Translate the Svg to the default Value
     */
    self.scaleAndTranslateToDefault = function () {
        $scope.config.diagramm.scale = $scope.defaultConfig.diagramm.scale;
        $scope.config.diagramm.x = $scope.defaultConfig.diagramm.x;
        $scope.config.diagramm.y = $scope.defaultConfig.diagramm.y;
        $scope.safeApply();
        self.updateZoomBehaviour();
    };

    //the svgouterzoom and drag listener
    var svgOuterZoomAndDrag = d3.behavior
        .zoom()
        .scaleExtent([self.zoomMin, self.zoomMax])
        .on("zoom", function () {
            var stop = d3.event.button || d3.event.ctrlKey;
            if (stop) d3.event.stopImmediatePropagation(); // stop zoom
            //dont translate on right click (3)
            if (d3.event.sourceEvent.which !== 3) {
                var newScale = Math.floor(d3.event.scale * 100) / 100;

                $scope.config.diagramm.scale = newScale;
                $scope.config.diagramm.x = d3.event.translate[0];
                $scope.config.diagramm.y = d3.event.translate[1];
                $scope.safeApply();
                self.svg.attr("transform", "translate(" + $scope.config.diagramm.x + "," + $scope.config.diagramm.y + ")" + " scale(" + $scope.config.diagramm.scale + ")");
            } else {
                console.log("rightclick!");
            }
        });


    //prevents the normal rightclickcontextmenu and add zoom
    self.svgOuter = d3.select(svgSelector)
        .call(svgOuterZoomAndDrag)
        //prevents doubleclick zoom
        .on("dblclick.zoom", null)
        //adds our custom context menu on rightclick
        .on("contextmenu", function () {
            d3.event.preventDefault();
        });

    /**
     * Click Listener when clicking on the outer svg =(not clicking on state or transition)
     */
    self.addSvgOuterClickListener = function () {
        self.svgOuter.on("click", function () {
            if (!self.preventSvgOuterClick) {
                self.closeStateMenu();
                self.closeTransitionMenu();
                $scope.safeApply();
            } else {
                //remove clickbool
                self.preventSvgOuterClick = false;
            }
        });
    };

    //add at the start
    self.addSvgOuterClickListener();

    //the html element where we put the svgGrid into
    self.svgGrid = self.svgOuter.append("g").attr("id", "grid");

    //inner svg
    self.svg = self.svgOuter
        .append("g")
        .attr("id", "svg-items");


    //first draw the transitions -> nodes are in front of them if they overlap
    self.svgTransitions = self.svg.append("g").attr("id", "transitions");
    self.svgStates = self.svg.append("g").attr("id", "states");



    //the space between each SnappingPoint 1:(0,0)->2:(0+gridSpace,0+gridSpace)
    self.gridSpace = 100;
    //the distance when the state is snapped to the next SnappingPoint (Rectangle form)
    self.gridSnapDistance = 20;
    //is Grid drawn
    self.isGrid = true;

    //watcher for the grid when changed -> updateGrid
    $scope.$watch('[statediagram.isGrid , config.diagramm]', function () {
        self.drawGrid();
    }, true);

    /**
     * Draw the Grid
     */
    self.drawGrid = function () {
        if (self.isGrid) {
            //clear grid
            self.svgGrid.html("");
            var width = self.svgOuter.style("width").replace("px", "");
            var height = self.svgOuter.style("height").replace("px", "");
            var thickness = 1 * $scope.config.diagramm.scale * 0.5;
            var xOffset = ($scope.config.diagramm.x % (self.gridSpace * $scope.config.diagramm.scale));
            var yOffset = ($scope.config.diagramm.y % (self.gridSpace * $scope.config.diagramm.scale));
            var i;
            //xGrid
            for (i = xOffset; i < width; i += self.gridSpace * $scope.config.diagramm.scale) {
                self.svgGrid
                    .append("line")
                    .attr("stroke-width", thickness)
                    .attr("class", "grid-line xgrid-line")
                    .attr("x1", i)
                    .attr("y1", 0)
                    .attr("x2", i)
                    .attr("y2", height);
            }
            //yGrid
            for (i = yOffset; i < height; i += self.gridSpace * $scope.config.diagramm.scale) {
                self.svgGrid
                    .append("line")
                    .attr("stroke-width", thickness)
                    .attr("class", "grid-line ygrid-line")
                    .attr("x1", 0)
                    .attr("y1", i)
                    .attr("x2", width)
                    .attr("y2", i);
            }
        } else {
            //undraw Grid
            self.svgGrid.html("");
        }
    };


    //DEFS
    self.defs = self.svg.append('svg:defs');
    //Marker-Arrow ( for the transitions)
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-create')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-animated')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-hover')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-selection')
        .attr('refX', 4)
        .attr('refY', 3)
        .attr('markerWidth', 5)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');


    /**
     * Reset all the AddListeners
     */
    self.resetAddActions = function () {
        self.closeStateMenu();
        self.closeTransitionMenu();
        self.svgOuter.on("click", null);
        self.inAddTransition = false;
        self.inAddState = false;
    };

    /**
     * AddState -> creates a new state when clicked on the button with visual feedback
     */
    self.addState = function () {
        self.resetAddActions();
        //add listener that the selectedstate follows the mouse
        self.svgOuter.on("mousemove", function () {
            //move the state (only moved visually not saved)
            self.selectedState.objReference.attr("transform", "translate(" + (((d3.mouse(this)[0]) - $scope.config.diagramm.x) * (1 / $scope.config.diagramm.scale)) + " " +
                (((d3.mouse(this)[1]) - $scope.config.diagramm.y) * (1 / $scope.config.diagramm.scale)) + ")");
        });
        //create a new selectedState in a position not viewable
        self.selectedState = $scope.addStateWithPresets(-10000, -10000);
        //add a class to the state (class has opacity)
        self.selectedState.objReference.classed("state-in-creation", true);
        self.svgOuter.on("click", function () {
            //remove class
            self.selectedState.objReference.classed("state-in-creation", false);
            //update the stateData
            self.selectedState.x = (((d3.mouse(this)[0]) - $scope.config.diagramm.x) * (1 / $scope.config.diagramm.scale));
            self.selectedState.y = (((d3.mouse(this)[1]) - $scope.config.diagramm.y) * (1 / $scope.config.diagramm.scale));
            self.selectedState.objReference.attr("transform", "translate(" + self.selectedState.x + " " + self.selectedState.y + ")");
            //remove mousemove listener
            self.svgOuter.on("mousemove", null);
            //overwrite the click listener
            self.addSvgOuterClickListener();
            self.preventSvgOuterClick = false;
            $scope.safeApply();

        });
    };

    /**
     * Addtransition function for the icon
     */
    self.addTransition = function () {
        self.resetAddActions();
        //prevent dragging during addTransition
        self.preventStateDragging = true;
        //1. FirstClick: select a state and create a tmpLine for visual feedback
        //SecondClick: Create a transition from selectState to the clickedState
        d3.selectAll(".state").on("click", function () {
            self.mouseInState = true;
            //if there is no selected state then select a state
            if (self.selectedState === null) {
                self.selectedState = $scope.getStateById(parseInt(d3.select(this).attr("object-id")));
                self.toggleState(self.selectedState.id, true);

                //create tmpLine
                self.tmpTransition = self.svgTransitions.append("g")
                    .attr("class", "transition");
                //the line itself with the arrow without the path itself
                self.tmpTransitionline = self.tmpTransition.append("path")
                    .attr("class", "transition-line curvedLine in-creation")
                    .attr("marker-end", "url(#marker-end-arrow-create)")
                    .attr("fill", "none");

                //if already selected a state then create transition to the clickedState
            } else {
                var tmpTransition = $scope.addTransition(self.selectedState.id, parseInt(d3.select(this).attr("object-id")), $scope.getNextTransitionName(self.selectedState.id));
                self.toggleState(self.selectedState.id, false);
                self.tmpTransition.remove();
                self.tmpTransition = null;
                self.tmpTransitionline = null;
                self.preventStateDragging = false;
                //update the svgOuter listeners
                self.addSvgOuterClickListener();
                self.svgOuter.on("mousemove", null);
                //update state listeners
                d3.selectAll(".state").on("mouseover", null);
                d3.selectAll(".state").on("mouseleave", null);
                d3.selectAll('.state').on('click', self.openStateMenu);

                //openTransitionMenu
                self.openTransitionMenu(tmpTransition.id);
            }

        });
        //2. if the mouse moves on the svgOuter and not on a state, then update the tmpLine
        self.svgOuter.on("mousemove", function () {
            if (!self.mouseInState && self.selectedState !== null) {
                var x = (((d3.mouse(this)[0]) - $scope.config.diagramm.x) * (1 / $scope.config.diagramm.scale));
                var y = (((d3.mouse(this)[1]) - $scope.config.diagramm.y) * (1 / $scope.config.diagramm.scale));
                var pathLine = self.bezierLine([[self.selectedState.x, self.selectedState.y], [x, y]]);
                self.tmpTransitionline.attr("d", pathLine);
            }
        });

        //3. if the mouse moves on a state then give a visual feedback how the line connects with the state
        d3.selectAll(".state").on("mouseover", function (i) {
            //see 2.
            self.mouseInState = true;
            //we need an other state to connect the line
            if (self.selectedState !== null) {
                var otherState = $scope.getStateById(d3.select(this).attr("object-id"));
                var transition = {};
                transition.fromState = self.selectedState.id;
                transition.toState = otherState.id;
                var line = self.tmpTransitionline;
                if (!self.existsDrawnTransition(self.selectedState.fromState, self.selectedState.toState)) {
                    //the group element
                    //if it is not a self Reference
                    if (transition.fromState != transition.toState) {
                        var drawConfig = self.getTransitionDrawConfig(transition);
                        //if there is a transition in the other direction
                        if (drawConfig.approachTransition) {
                            //other transition in the other direction
                            var otherTrans = self.getDrawnTransition(transition.toState, transition.fromState);
                            var otherDrawConfig = self.getTransitionDrawConfig(otherTrans, true);
                            self.updateTransitionLines(otherTrans.objReference, otherDrawConfig.path);
                            otherTrans.objReference.select(".transition-text")
                                .attr("x", otherDrawConfig.xText)
                                .attr("y", otherDrawConfig.yText);
                            //update the transition text position
                            self.otherTransition = otherTrans;

                        }
                        //get the curve data ( depends if there is a transition in the oposite direction)
                        line.attr("d", drawConfig.path);
                        //if it is a selfreference
                    } else {
                        var stateId = $scope.getArrayStateIdByStateId(transition.fromState);
                        var x = $scope.config.states[stateId].x;
                        var y = $scope.config.states[stateId].y;
                        line.attr("d", self.selfTransition(x, y));
                    }
                    //if there is already a transition with the same fromState and toState then the current
                } else {
                    //add the name to the drawnTransition
                    var drawnTransition = self.getDrawnTransition(transition.fromState, transition.toState);
                    drawnTransition.names.push(transition.name);
                    //drawn the new name to the old transition (svg)
                    self.writeTransitionText(drawnTransition.objReference.select(".transition-text"), drawnTransition.names);


                }
                self.tmpTransitionline.attr("x1", self.selectedState.x)
                    .attr("y1", self.selectedState.y)
                    .attr("x2", otherState.x)
                    .attr("y2", otherState.y);
            }
        }).on("mouseleave", function () {
            self.mouseInState = false;
            //remove the visual feedback from transition going against our tmpLine
            if (self.otherTransition !== null && self.otherTransition !== undefined) {
                var otherDrawConfig = self.getTransitionDrawConfig(self.otherTransition);
                self.updateTransitionLines(self.otherTransition.objReference, otherDrawConfig.path);
                self.otherTransition.objReference.select(".transition-text")
                    .attr("x", (otherDrawConfig.xText))
                    .attr("y", (otherDrawConfig.yText));
            }
        });
    };

    /**
     * Renames the state in the svg after the $scope variable was changed
     * @param  {number} stateId      
     * @param  {String} newStateName          
     */
    self.renameState = function (stateId, newStateName) {
        var state = $scope.config.states[$scope.getArrayStateIdByStateId(stateId)];
        var objReference = state.objReference;
        objReference.select("text").text(newStateName);
    };

    /**
     * Removes the state with the given id
     * @param  {number} stateId 
     */
    self.removeState = function (stateId) {
        self.closeStateMenu();
        var state = $scope.config.states[$scope.getArrayStateIdByStateId(stateId)];
        var objReference = state.objReference;
        objReference.remove();
    };


    /**
     * Renames a transition
     * @param {number} fromState         the fromStateId
     * @param {number} toState           the toStateID
     * @param {number} transitionId      the transitionid
     * @param {char}   newTransitionName the new transitionname
     */
    self.renameTransition = function (fromState, toState, transitionId, newTransitionName) {
        //change it in drawnTransition
        var drawnTransition = self.getDrawnTransition(fromState, toState);
        var drawnTransitionName = _.find(drawnTransition.names, {
            "id": transitionId
        });
        drawnTransitionName.name = newTransitionName;

        //change it on the svg
        self.writeTransitionText(drawnTransition.objReference.select(".transition-text"), drawnTransition.names);
    };


    /**
     * removes a transition from the svg
     * @param   {number}   transitionId
     */
    self.removeTransition = function (transitionId) {
        var tmpTransition = $scope.getTransitionById(transitionId);
        var tmpDrawnTransition = self.getDrawnTransition(tmpTransition.fromState, tmpTransition.toState);
        var drawConfig = self.getTransitionDrawConfig(tmpTransition);
        self.closeTransitionMenu();
        //if its the only transition in the drawn transition -> then remove the drawn transition
        if (tmpDrawnTransition.names.length === 1) {
            tmpDrawnTransition.objReference.remove();
            _.remove($scope.config.drawnTransitions, function (n) {
                return n == tmpDrawnTransition;
            });
            //if there is an approad transition, then draw it with the new drawconfig
            if (drawConfig.approachTransition) {
                //other transition in the other direction
                var otherTrans = self.getDrawnTransition(tmpTransition.toState, tmpTransition.fromState);
                var otherDrawConfig = self.getTransitionDrawConfig(otherTrans, false);
                self.updateTransitionLines(otherTrans.objReference, otherDrawConfig.path);
                otherTrans.objReference.select(".transition-text")
                    .attr("x", otherDrawConfig.xText)
                    .attr("y", otherDrawConfig.yText);
                //update the transition text position
                self.otherTransition = otherTrans;

            }
        }
        //if there are other transitions with the same from- and tostate, then remove the transition from the names and redraw the text
        else {
            _.remove(tmpDrawnTransition.names, function (n) {
                return n.id == tmpTransition.id;
            });
            self.writeTransitionText(tmpDrawnTransition.objReference.select(".transition-text"), tmpDrawnTransition.names);
            drawConfig = self.getTransitionDrawConfig(tmpTransition);
            tmpDrawnTransition.objReference.select(".transition-text")
                .attr("x", drawConfig.xText)
                .attr("y", drawConfig.yText);
            console.log(tmpDrawnTransition);

            self.openTransitionMenu(tmpDrawnTransition.names[tmpDrawnTransition.names.length - 1].id);

        }


    };

    /**
     * Adds a stateId to the final states on the svg (visual feedback)
     * @param {number} stateId
     */
    self.addFinalState = function (stateId) {
        var state = $scope.getStateById(stateId);
        state.objReference.insert("circle", ".state-circle")
            .attr("class", "final-state")
            .attr("r", self.settings.finalStateRadius);

        //TODO: update the transitions to the state

    };

    /**
     * Removes a final state on the svg
     * @param {number} stateId 
     */
    self.removeFinalState = function (stateId) {
        var state = $scope.getStateById(stateId);
        state.objReference.select(".final-state").remove();
        //TODO update the transitions to the state
    };

    /**
     * Changes the StartState to the stateid
     * @param {number} stateId 
     */
    self.changeStartState = function (stateId) {
        //TODO:
        //remove old startState
        if ($scope.config.startState !== null) {
            var state = $scope.getStateById($scope.config.startState);
            state.objReference.select(".start-line").remove();
        }

        var otherState = $scope.getStateById(stateId);
        otherState.objReference.append("line")
            .attr("class", "transition-line start-line")
            .attr("x1", 0)
            .attr("y1", 0 - 75)
            .attr("x2", 0)
            .attr("y2", 0 - self.settings.stateRadius - 4)
            .attr("marker-end", "url(#marker-end-arrow)");
    };

    /**
     * removes the stateId
     * @param {number} stateId
     */
    self.removeStartState = function (stateId) {
        var state = $scope.getStateById($scope.config.startState);
        state.objReference.select(".start-line").remove();
        $scope.config.startState = null;
        $scope.updateListener();
    };

    /**
     * Draws a State 
     * @param  {number} id the stateid
     * @return {Reference}    Returns the reference of the group object
     */
    self.drawState = function (id) {
        var state = $scope.getStateById(id);
        var group = self.svgStates.append("g")
            .attr("transform", "translate(" + state.x + " " + state.y + ")")
            .attr("class", "state " + "state-" + state.id)
            .attr("object-id", state.id); //save the state-id

        var circle = group.append("circle")
            .attr("class", "state-circle")
            .attr("r", self.settings.stateRadius);
        //for outer circle dotted when selected

        var hoverCircle = group.append("circle")
            .attr("class", "state-circle hover-circle")
            .attr("r", self.settings.stateRadius);

        var text = group.append("text")
            .text(state.name)
            .attr("class", "state-text")
            .attr("dominant-baseline", "central")
            .attr("text-anchor", "middle");

        state.objReference = group;
        group.on('click', self.openStateMenu)
            .call(self.dragState);
        return group;
    };

    /**
     * Adds or remove a class to a state ( only the svg state)
     * @param {number} stateId 
     * @param {Boolean} state   
     * @param {String} className  
     */
    self.setStateClassAs = function (stateId, state, className) {
        var objReference = $scope.getStateById(stateId).objReference;
        objReference.classed(className, state);
    };

    /**
     * Sets a transition class to a specific class or removes the specific class
     * @param {number}   transitionId
     * @param {boolean} state        if the class should be added or removed
     * @param {string}  className    the classname
     */
    self.setTransitionClassAs = function (transitionId, state, className) {
        var trans = $scope.getTransitionById(transitionId);
        var objReference = self.getDrawnTransition(trans.fromState, trans.toState).objReference;
        objReference.classed(className, state);
        if (state && className == 'animated-transition') {
            objReference.select(".transition-line").attr("marker-end", "url(#marker-end-arrow-animated)");
        } else {
            objReference.select(".transition-line").attr("marker-end", "url(#marker-end-arrow)");
        }
    };

    /**
     * sets the arrow marker of a transition, cause we couldnt change the color of an arrow marker
     * @param {object} transLine the transitionlineobject
     * @param {string} suffix    which arrow should be changed
     */
    self.setArrowMarkerTo = function (transLine, suffix) {

        if (suffix !== '') {
            transLine.select('.transition-line').attr("marker-end", "url(#marker-end-arrow-" + suffix + ")");
        } else {
            transLine.select('.transition-line').attr("marker-end", "url(#marker-end-arrow)");
        }
    };


    /**
     * Opens the StateMenu
     */
    self.openStateMenu = function () {
        console.log("open state menu");
        self.closeStateMenu();
        self.closeTransitionMenu();
        //fixes weird errors
        $scope.safeApply();

        self.preventSvgOuterClick = true;
        self.showStateMenu = true;
        self.selectedState = $scope.getStateById(parseInt(d3.select(this).attr("object-id")));
        //add new state as selected
        self.toggleState(self.selectedState.id, true);

        //save the state values in the state context as default value
        self.input = {};
        self.input.state = self.selectedState;
        self.input.stateName = self.selectedState.name;
        self.input.startState = $scope.config.startState == self.selectedState.id;
        self.input.finalState = $scope.isStateAFinalState(self.selectedState.id);
        self.input.ttt = "";
        self.input.tttisopen = false;
        $scope.safeApply();
        self.stateMenuListener = [];
        //Menu watcher
        self.stateMenuListener.push($scope.$watch('statediagram.input.startState', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                if (self.input.startState) {
                    $scope.changeStartState(self.input.state.id);
                } else {
                    if (self.selectedState.id == $scope.config.startState)
                        $scope.removeStartState();
                }
            }

        }));
        self.stateMenuListener.push($scope.$watch('statediagram.input.finalState', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                if (self.input.finalState) {
                    $scope.addFinalState(self.input.state.id);
                } else {
                    $scope.removeFinalState(self.input.state.id);
                }

            }

        }));
        self.stateMenuListener.push($scope.$watch('statediagram.input.stateName', function (newValue, oldValue) {
            //if the name got changed but is not empty
            //reset the tooltip
            self.input.tttisopen = false;
            if (newValue !== oldValue) {
                //change if the name doesnt exists and isnt empty
                if (newValue !== "" && !$scope.existsStateWithName(newValue)) {
                    var renameError = !$scope.renameState(self.input.state.id, newValue);
                } else if (newValue === "") {
                    //FEEDBACK
                    self.input.tttisopen = true;
                    self.input.ttt = 'STATE_MENU.NAME_TOO_SHORT';
                } else if ($scope.existsStateWithName(newValue, self.input.state.id)) {
                    self.input.tttisopen = true;
                    self.input.ttt = 'STATE_MENU.NAME_ALREADY_EXIST';
                }
            }
        }));
    };

    /**
     * closes the state menu
     */
    self.closeStateMenu = function () {
        //remove old StateMenuListeners
        _.forEach(self.stateMenuListener, function (value, key) {
            value();
        });
        if (self.selectedState !== null) {
            self.toggleState(self.selectedState.id, false);
        }
        self.stateMenuListener = null;
        self.showStateMenu = false;

        //delete input
        self.input = null;
    };

    /**
     * toggle a state
     * @param {number} stateId 
     * @param {bool}   bool
     */
    self.toggleState = function (stateId, bool) {
        self.setStateClassAs(stateId, bool, "active");
        if (bool === false) {
            self.selectedState = null;
        }

    };


    //Node drag and drop behaviour
    self.dragState = d3.behavior.drag()
        .on("dragstart", function () {
            //stops drag bugs when wanted to click
            self.dragAmount = 0;
            d3.event.sourceEvent.stopPropagation();
        })
        .on("drag", function () {

            if (d3.event.sourceEvent.which == 1) {
                if (!self.preventStateDragging) {
                    self.dragAmount++;

                    var x = d3.event.x;
                    var y = d3.event.y;

                    if (self.snapping) {


                        var snapPointX = x - (x % self.gridSpace);
                        var snapPointY = y - (y % self.gridSpace);

                        //check first snapping Point (top left)
                        if (x > snapPointX - self.gridSnapDistance && x < snapPointX + self.gridSnapDistance && y > snapPointY - self.gridSnapDistance && y < snapPointY + self.gridSnapDistance) {
                            x = snapPointX;
                            y = snapPointY;
                            //second snapping point (top right)
                        } else if (x > snapPointX + self.gridSpace - self.gridSnapDistance && x < snapPointX + self.gridSpace + self.gridSnapDistance && y > snapPointY - self.gridSnapDistance && y < snapPointY + self.gridSnapDistance) {
                            x = snapPointX + self.gridSpace;
                            y = snapPointY;
                            //third snapping point (bot left)
                        } else if (x > snapPointX - self.gridSnapDistance && x < snapPointX + self.gridSnapDistance && y > snapPointY + self.gridSpace - self.gridSnapDistance && y < snapPointY + self.gridSpace + self.gridSnapDistance) {
                            x = snapPointX;
                            y = snapPointY + self.gridSpace;
                            //fourth snapping point (bot right)
                        } else if (x > snapPointX + self.gridSpace - self.gridSnapDistance && x < snapPointX + self.gridSpace + self.gridSnapDistance && y > snapPointY + self.gridSpace - self.gridSnapDistance && y < snapPointY + self.gridSpace + self.gridSnapDistance) {
                            x = snapPointX + self.gridSpace;
                            y = snapPointY + self.gridSpace;
                        }
                    }

                    //on drag isnt allowed workaround for bad drags when wanted to click
                    if (self.dragAmount > 1) {

                        //update the shown node
                        d3.select(this)
                            .attr("transform", "translate(" + x + " " + y + ")");
                        //update the node in the array

                        var stateId = d3.select(this).attr("object-id");
                        var tmpState = $scope.getStateById(stateId);
                        //update the state coordinates in the dataobject
                        tmpState.x = x;
                        tmpState.y = y;

                        //update the transitions after dragging a node
                        self.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"));
                    }
                }
            }

        }).on("dragend", function () {
            //save the movement
            if (self.dragAmount > 1) {
                $scope.safeApply();
            }
        });


    /**
     * gets the path for a selftransition
     * @param   {number} x
     * @param   {number} y 
     * @returns {String} path of the selftransition
     */
    self.selfTransition = function (x, y) {
        return self.bezierLine([
                [x - self.stateSelfReferenceNumber, y - self.stateSelfReferenceNumber],
                [x - self.stateSelfReferenceNumber - stretchX, y - self.stateSelfReferenceNumber - stretchY],
                [x - self.stateSelfReferenceNumber - stretchX, y + self.stateSelfReferenceNumber + stretchY],
                [x - self.stateSelfReferenceNumber, y + self.stateSelfReferenceNumber]
            ]);
    };

    /**
     * Crossproduct helper function
     * @param   {object}   a vector
     * @param   {object}   b vector
     * @returns {object}   crossproduct vetor 
     */
    function crossPro(a, b) {

        var vecC = {
            x: a.y * b.z,
            y: -a.x * b.z

        };
        return vecC;
    }

    function toDegrees(angle) {
        return angle * (180 / Math.PI);
    }

    function toRadians(angle) {
        return angle * (Math.PI / 180);
    }

    /**
     * expands a vector with a given factor
     * @param   {object} a      vector
     * @param   {number} factor expandfactor
     * @returns {object} expanded vector
     */
    function expandVector(a, factor) {
        return {
            x: a.x * factor,
            y: a.y * factor
        };
    }

    function fixVectorLength(a) {
        var tmp = 1 / Math.sqrt(a.x * a.x + a.y * a.y);
        return {
            x: a.x * tmp,
            y: a.y * tmp

        };
    }

    function AngleBetweenTwoVectors(a, b) {
        var tmp = (a.x * b.x + a.y * b.y) / (Math.sqrt(a.x * a.x + a.y * a.y) * Math.sqrt(b.x * b.x + b.y * b.y));
        var tmp2 = Math.acos(tmp);
        return {
            val: tmp,
            rad: tmp2,
            degree: toDegrees(tmp2)
        };
    }

    function newAngle(a, b) {
        var dot1 = a.x * b.x + a.y * b.y; //dot product
        var dot2 = a.x * b.y - a.y * b.x; //determinant
        return Math.atan2(dot2, dot1); //atan2(y, x) or atan2(sin, cos)
    }

    var degreeConstant = 30;

    function getAngles(a, b) {
        var angle = toDegrees(newAngle(a, b));
        if (angle < 0) {
            angle = angle + 360;
        }

        var upperAngle = angle + degreeConstant;
        if (upperAngle > 360) {
            upperAngle -= 360;
        }
        var lowerAngle = angle - degreeConstant;
        if (lowerAngle < 0) {
            lowerAngle += 360;
        }

        return {
            angle: angle,
            lowerAngle: lowerAngle,
            upperAngle: upperAngle
        };
    }

    //Get the Path from an array -> for the transition
    self.bezierLine = d3.svg.line()
        .x(function (d) {
            return d[0];
        })
        .y(function (d) {
            return d[1];
        })
        .interpolate("basis");

    /**
     * Returns the transitionDrawConfig with all the data like xstart, xend, xtext....
     * @param   {object}  transition    the transitionobj
     * @param   {boolean} forceApproach if we force an approachedtransition ->needed when the transition was writed to the array, or for the addtransition
     * @returns {object}  the drawConfig
     */
    self.getTransitionDrawConfig = function (transition, forceApproach) {
        //the distance the endPoint of the transition is away from the state
        var gapBetweenTransitionLineAndState = 3;
        var obj = {};

        /**1: Check if there is a transition aproach our transition**/
        obj.approachTransition = forceApproach || self.existsDrawnTransition(transition.toState, transition.fromState);

        /****2. Get the xStart,yStart and xEnd,yEnd  and xMid,yMid***/
        //from and to State
        var fromState = $scope.getStateById(transition.fromState);
        var toState = $scope.getStateById(transition.toState);
        var isToStateAFinalState = $scope.isStateAFinalState(transition.toState);
        //the x and y coordinates
        var x1 = fromState.x;
        var y1 = fromState.y;
        var x2 = toState.x;
        var y2 = toState.y;

        var xCurv1,
            yCurv1,
            xCurv2,
            yCurv2;

        //needed for the calculation of the coordinates
        var directionvector = {
            x: x2 - x1,
            y: y2 - y1
        };
        var directionVectorLength = Math.sqrt(directionvector.x * directionvector.x + directionvector.y * directionvector.y);
        var nStart = self.settings.stateRadius / directionVectorLength;
        var nEnd;
        if (isToStateAFinalState) {
            nEnd = (self.settings.stateRadius + gapBetweenTransitionLineAndState + 5) / directionVectorLength;
        } else {
            nEnd = (self.settings.stateRadius + gapBetweenTransitionLineAndState) / directionVectorLength;
        }

        obj.xStart = x1 + nStart * directionvector.x;
        obj.yStart = y1 + nStart * directionvector.y;

        obj.xEnd = x2 - nEnd * directionvector.x;
        obj.yEnd = y2 - nEnd * directionvector.y;
        obj.xDiff = x2 - x1;
        obj.yDiff = y2 - y1;
        obj.xMid = (x1 + x2) / 2;
        obj.yMid = (y1 + y2) / 2;
        obj.distance = Math.sqrt(obj.xDiff * obj.xDiff + obj.yDiff * obj.yDiff);
        /**3: Calc the CurvedPoint**/
        //BETTER ONLY CALC WHEN obj.approachTransition = true;
        var vecA = {
            x: obj.xMid - obj.xStart,
            y: obj.yMid - obj.yStart,
            z: 0
        };

        var vecB = {
            x: 0,
            y: 0,
            z: 1
        };


        var vecX = {
            x: 1,
            y: 0,
            z: 0
        };



        var stretchValue, movingPoint;
        //OLD:stretchValue = (70 * (1 / obj.distance * 1.1) * 1.4);
        stretchValue = 20;

        movingPoint = crossPro(vecA, vecB);
        movingPoint = fixVectorLength(movingPoint);

        movingPoint = expandVector(movingPoint, stretchValue);

        /**4:Calc the curvestart and end if there is and approach transition**/
        if (obj.approachTransition) {

            var xStart = getAngles({
                x: obj.xStart - x1,
                y: obj.yStart - y1
            }, {
                x: self.settings.stateRadius,
                y: 0
            });

            var xEnd = getAngles({
                x: obj.xEnd - x2,
                y: obj.yEnd - y2
            }, {
                x: self.settings.stateRadius,
                y: 0
            });

            obj.xStart = x1 + (self.settings.stateRadius * Math.cos(toRadians(xStart.upperAngle)));
            obj.yStart = y1 - (self.settings.stateRadius * Math.sin(toRadians(xStart.upperAngle)));

            obj.xEnd = x2 + (self.settings.stateRadius * Math.cos(toRadians(xEnd.lowerAngle)));
            obj.yEnd = y2 - (self.settings.stateRadius * Math.sin(toRadians(xEnd.lowerAngle)));
        }

        //OLD:stretchValue = (70 * (1 / obj.distance * 1.1) * 1.4);
        stretchValue = 35;

        movingPoint = crossPro(vecA, vecB);
        movingPoint = fixVectorLength(movingPoint);
        movingPoint = expandVector(movingPoint, stretchValue);
        obj.xMidCurv = movingPoint.x + obj.xMid;
        obj.yMidCurv = movingPoint.y + obj.yMid;


        /**5:Calc the textposition**/
        var existsDrawnTrans = self.existsDrawnTransition(fromState.id, toState.id);
        var drawnTrans = self.getDrawnTransition(fromState.id, toState.id);
        var transNamesLength;
        if (drawnTrans) {
            transNamesLength = drawnTrans.names.length;
        } else {
            transNamesLength = 1;
        }
        var angleAAndX = AngleBetweenTwoVectors(vecA, vecX);

        var textStretchValue, textPoint;
        var textAngle = angleAAndX.degree;
        if (textAngle > 90) {
            textAngle = 90 - (textAngle % 90);
        }
        var x = Math.pow((textAngle / 90), 1 / 2);

        if (obj.approachTransition) {
            textStretchValue = (40 + (8 * transNamesLength) * x);
        } else {
            textStretchValue = (12 + (transNamesLength * 8) * x);
        }


        textPoint = crossPro(vecA, vecB);
        textPoint = fixVectorLength(textPoint);
        textPoint = expandVector(textPoint, textStretchValue);

        obj.xText = textPoint.x + obj.xMid;
        obj.yText = textPoint.y + obj.yMid;


        /**6:Calc the path**/
        var array = [];
        if (obj.approachTransition) {
            array = [
                [obj.xStart, obj.yStart],
                [obj.xMidCurv, obj.yMidCurv],
                [obj.xEnd, obj.yEnd]
            ];
        } else {
            array = [
                [obj.xStart, obj.yStart],
                [obj.xEnd, obj.yEnd]
            ];
        }
        obj.path = self.bezierLine(array);
        return obj;
    };

    /**
     * Adds the transition names to the text of a transition
     * @param {object} textObj the transition textObjReference
     * @param {array}  names   the names array of the transition
     */
    self.writeTransitionText = function (textObj, names) {
        textObj.selectAll("*").remove();
        for (var i = 0; i < names.length; i++) {
            //fix when creating new transition when in animation
            if ($scope.simulator.animated.transition !== null && names[i].id === $scope.simulator.animated.transition.id) {
                textObj.append('tspan').attr('transition-id', names[i].id).text(names[i].name).classed("animated-transition-text", true);
            } else {
                textObj.append('tspan').attr('transition-id', names[i].id).text(names[i].name);
            }

            if (i < names.length - 1)
                textObj.append('tspan').text(' | ');
        }


    };

    /**
     * Draw a Transition
     * @param  {number} id 
     * @return {object}  Retruns the reference of the group object
     */
    self.drawTransition = function (transitionId) {
        var transition = $scope.getTransitionById(transitionId);
        //if there is not a transition with the same from and toState
        if (!self.existsDrawnTransition(transition.fromState, transition.toState)) {
            //the group element
            var group = self.svgTransitions.append("g")
                .attr("class", "transition"),
                //the line itself with the arrow
                lineSelection = group.append("path")
                .attr("class", "transition-line-selection")
                .attr("fill", "none")
                .attr("marker-end", "url(#marker-end-arrow-selection)"),
                line = group.append("path")
                .attr("class", "transition-line")
                .attr("fill", "none")
                .attr("marker-end", "url(#marker-end-arrow)"),

                lineClickArea = group.append("path")
                .attr("class", "transition-line-click")
                .attr("stroke-width", 20)
                .attr("stroke", "transparent")
                .attr("fill", "none"),
                lineHover = group.append("path")
                .attr("class", "transition-line-hover")
                .attr("fill", "none")
                .attr("marker-end", "url(#marker-end-arrow-hover)"),
                //the text of the transition
                text = group.append("text")
                .attr("class", "transition-text")
                .attr("dominant-baseline", "central")
                .attr("fill", "black");
            //if it is not a self Reference
            if (transition.fromState != transition.toState) {
                var drawConfig = self.getTransitionDrawConfig(transition);
                //if there is an approached transition update the approached transition
                if (drawConfig.approachTransition) {
                    //other transition in the other direction
                    var otherTrans = self.getDrawnTransition(transition.toState, transition.fromState);
                    var otherTransdrawConfig = self.getTransitionDrawConfig(otherTrans, true);
                    self.updateTransitionLines(otherTrans.objReference, otherTransdrawConfig.path);
                    //update the transition text position
                    otherTrans.objReference.select(".transition-text")
                        .attr("x", (otherTransdrawConfig.xText))
                        .attr("y", (otherTransdrawConfig.yText));
                }
                //draw the text
                text.attr("class", "transition-text")
                    .attr("x", (drawConfig.xText))
                    .attr("y", (drawConfig.yText));
                self.updateTransitionLines(group, drawConfig.path);

                //if it is a selfreference
            } else {
                var stateId = $scope.getArrayStateIdByStateId(transition.fromState);
                var x = $scope.config.states[stateId].x;
                var y = $scope.config.states[stateId].y;

                self.updateTransitionLines(group, self.selfTransition(x, y));
                text.attr("x", x - self.settings.stateRadius - 50)
                    .attr("y", y);
            }
            //add the drawnTransition
            group.attr("object-id", $scope.config.drawnTransitions.push({
                fromState: transition.fromState,
                toState: transition.toState,
                names: [{
                    "id": transition.id,
                    "name": transition.name
                }],
                objReference: group
            }) - 1);
            self.writeTransitionText(text, self.getDrawnTransition(transition.fromState, transition.toState).names);
            group.attr("from-state-id", transition.fromState)
                .attr("to-state-id", transition.toState)
                .on('click', self.openTransitionMenu)
                .on("mouseover", function () {
                    d3.select(this).select('.transition-line-hover').attr("style", "opacity:0.6");
                }).on("mouseleave", function () {
                    d3.select(this).select('.transition-line-hover').attr("style", "");
                });
            return group;
            //if there is already a transition with the same fromState and toState then the current
        } else {
            //add the name to the drawnTransition
            var drawnTransition = self.getDrawnTransition(transition.fromState, transition.toState);
            drawnTransition.names.push({
                "id": transition.id,
                "name": transition.name
            });
            //drawn the new name to the old transition (svg)
            self.writeTransitionText(drawnTransition.objReference.select('.transition-text'), self.getDrawnTransition(transition.fromState, transition.toState).names);
            var drawConfigNew = self.getTransitionDrawConfig(transition);
            drawnTransition.objReference.select('.transition-text')
                .attr("x", (drawConfigNew.xText))
                .attr("y", (drawConfigNew.yText));

        }
    };

    /**
     * helper function updates all the transition lines
     * @param {object}   transitionobjReference
     * @param {string}   path                   
     */
    self.updateTransitionLines = function (transitionobjReference, path) {
        transitionobjReference.select(".transition-line").attr("d", path);
        transitionobjReference.select(".transition-line-selection").attr("d", path);
        transitionobjReference.select(".transition-line-hover").attr("d", path);
        transitionobjReference.select(".transition-line-click").attr("d", path);
    };

    /**
     * opens the transitionmenu
     * @param {number} transitionId when there is a transitionId we open the transitionmenu with the given id
     */
    self.openTransitionMenu = function (transitionId) {
        self.closeStateMenu();
        self.closeTransitionMenu();
        self.preventSvgOuterClick = true;
        self.showTransitionMenu = true;

        var fromState, toState;
        if (transitionId === undefined) {
            fromState = d3.select(this).attr('from-state-id');
            toState = d3.select(this).attr('to-state-id');
            self.selectedTransition = self.getDrawnTransition(fromState, toState);
        } else {
            var tmpTransition = $scope.getTransitionById(transitionId);
            fromState = tmpTransition.fromState;
            toState = tmpTransition.toState;
            self.selectedTransition = self.getDrawnTransition(fromState, toState);
        }

        self.selectedTransition.objReference.classed("active", true);

        self.input = {};
        self.input.fromState = $scope.getStateById(fromState);
        self.input.toState = $scope.getStateById(toState);
        self.input.transitions = [];


        _.forEach(self.selectedTransition.names, function (value, key) {
            var tmpObject = {};
            tmpObject = cloneObject(value);

            if (transitionId !== undefined) {
                if (value.id == transitionId) {
                    tmpObject.isFocus = true;
                }
            } else if (self.selectedTransition.names.length - 1 === key) {
                tmpObject.isFocus = true;

            }
            //add other variables
            tmpObject.ttt = "";
            tmpObject.tttisopen = false;
            self.input.transitions.push(tmpObject);
        });

        self.transitionMenuListener = [];

        /*jshint -W083 */
        for (var i = 0; i < self.input.transitions.length; i++) {
            self.transitionMenuListener.push($scope.$watchCollection("statediagram.input.transitions['" + i + "']", function (newValue, oldValue) {
                if (newValue.name !== oldValue.name) {
                    newValue.tttisopen = false;
                    if (newValue.name !== "" && !$scope.existsTransition(fromState, toState, newValue.name)) {
                        $scope.renameTransition(newValue.id, newValue.name);
                    } else if (newValue.name === "") {
                        newValue.tttisopen = true;
                        newValue.ttt = 'TRANS_MENU.NAME_TOO_SHORT';
                    } else if ($scope.existsTransition(fromState, toState, newValue.name, newValue.id)) {
                        newValue.tttisopen = true;
                        newValue.ttt = 'TRANS_MENU.NAME_ALREAD_EXISTS';
                    }
                    console.log(($scope.existsTransition(fromState, toState, newValue.name, newValue.id)));
                }
            }));
        }


        $scope.safeApply();

    };

    /**
     * closes the transitionmenu
     */
    self.closeTransitionMenu = function () {
        _.forEach(self.transitionMenuListener, function (value, key) {
            value();
        });
        self.showTransitionMenu = false;
        if (self.selectedTransition !== null) {
            self.selectedTransition.objReference.classed("active", false);
            self.selectedTransition = null;

        }
    };

    /**
     * Update the transitions in the svg after moving a state
     * @param  {number} stateId Moved stateId
     */
    self.updateTransitionsAfterStateDrag = function (stateId) {
        var stateName = $scope.config.states[$scope.getArrayStateIdByStateId(stateId)].name;
        _.forEach($scope.config.drawnTransitions, function (n, key) {
            if (n.fromState == stateId || n.toState == stateId) {
                //if its not a selfreference
                var obj = n.objReference,
                    transitionText = obj.select("text");
                if (n.fromState != n.toState) {
                    var drawConfig = self.getTransitionDrawConfig(n);
                    //if there is a transition in the other direction
                    self.updateTransitionLines(obj, drawConfig.path);
                    transitionText.attr("x", drawConfig.xText).attr("y", drawConfig.yText);
                } else {
                    var moveStateId = n.fromState;
                    var x = $scope.config.states[$scope.getArrayStateIdByStateId(moveStateId)].x;
                    var y = $scope.config.states[$scope.getArrayStateIdByStateId(moveStateId)].y;
                    //update Transistion with self reference
                    self.updateTransitionLines(obj, self.selfTransition(x, y));
                    transitionText.attr("x", x - self.settings.stateRadius - 50).attr("y", y);
                }
            }
        });
    };

    /**************
     **SIMULATION**
     *************/


    $scope.$watch('simulator.animated.currentState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            console.log("CURRENTSTATE:oldValue " + oldValue + " newvalue " + newValue);
            console.log("status" + $scope.simulator.status);
            if (oldValue !== null) {
                self.setStateClassAs(oldValue, false, "animated-currentstate-svg");
                self.setStateClassAs(oldValue, false, "animated-accepted-svg");
                self.setStateClassAs(oldValue, false, "animated-not-accepted-svg");

            }
            if (newValue !== null) {
                if ($scope.simulator.status === "accepted") {
                    self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-accepted-svg");
                } else if ($scope.simulator.status === "not accepted") {
                    self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-not-accepted-svg");
                } else {
                    self.setStateClassAs(newValue, true, "animated-currentstate-svg");
                }
            }
        }
    });

    $scope.$watch('simulator.animated.transition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            if (oldValue !== null) {
                self.setTransitionClassAs(oldValue.id, false, "animated-transition");
                d3.selectAll("[transition-id='" + oldValue.id + "'").classed("animated-transition-text", false);
                //remove transitionname animation
            }
            if (newValue !== null) {
                self.setTransitionClassAs(newValue.id, true, "animated-transition");
                console.log(newValue);
                d3.selectAll("[transition-id='" + newValue.id + "'").classed("animated-transition-text", true);
                //animate transitionname
            }
        }
    });

    $scope.$watch('simulator.animated.nextState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            console.log("NEXTSTATE: oldValue " + oldValue + " newvalue " + newValue);
            if (oldValue !== null) {
                self.setStateClassAs(oldValue, false, "animated-nextstate-svg");
            }
            if (newValue !== null) {
                self.setStateClassAs(newValue, true, "animated-nextstate-svg");
            }
        }
    });
    $scope.$watch('simulator.status', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            if ($scope.simulator.status === "accepted") {
                self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-accepted-svg");
            } else if ($scope.simulator.status === "not accepted") {
                self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-not-accepted-svg");
            }
        }

    });
}
function StatetransitionfunctionDFA($scope) {
    "use strict";

    var self = this;
    self.functionData = {};
    self.functionData.states = [];
    self.functionData.startState = '';
    self.functionData.finalStates = '';
    self.functionData.transitions = '';
    self.functionData.statetransitionfunction = [];
    //ADD Listener
    $scope.updateListeners.push(self);


    self.updateFunction = function () {
        var arrayAlphabet = [];
        var stringAlphabet = '';
        var stringStates = '';
        var stringStateTransitions = '';
        var stringAllStateTransitions = '';
        var stringStartState = '';
        var startState;
        var stringFinalStates = '';
        var finalState;
        var i;

        self.functionData.transitions = $scope.config.alphabet;



        //Update of States
        self.functionData.states = [];
        _.forEach($scope.config.states, function (state, key) {
            stringStates = '';
            var selectedClass = '';
            if ($scope.statediagram.selectedState !== null && $scope.statediagram.selectedState.id == state.id) {
                selectedClass = "selected";
            }
            if (state.id == $scope.simulator.animated.currentState && $scope.simulator.status === "accepted") {
                stringStates += '<span class="animated-accepted ' + selectedClass + '">';
            } else if (state.id == $scope.simulator.animated.currentState && $scope.simulator.status === "not accepted") {
                stringStates += '<span class="animated-not-accepted ' + selectedClass + '">';
            } else if (state.id == $scope.simulator.animated.currentState) {
                stringStates += '<span class="animated-currentstate ' + selectedClass + '">';
            } else {
                stringStates += '<span class="' + selectedClass + '">';
            }

            stringStates += state.name;
            stringStates += '</span>';
            if (key < $scope.config.states.length - 1) {
                stringStates = stringStates + ', ';
            }
            self.functionData.states.push(stringStates);
        });



        //Update of statetransitionfunction
        self.functionData.statetransitionfunction = [];
        //we go through every state and check if there is a transition and then we save them in the statetransitionfunction array
        _.forEach($scope.config.states, function (state, keyOuter) {
            _.forEach($scope.config.transitions, function (transition, key) {

                if (transition.fromState === state.id) {
                    var stateTransition = transition;
                    var selectedTransition = false;
                    if ($scope.statediagram.selectedTransition !== null && _.find($scope.statediagram.selectedTransition.names, {
                            id: transition.id
                        }) !== undefined) {
                        selectedTransition = true;
                    }
                    var animatedCurrentState = false;
                    if ($scope.simulator.animated.transition && $scope.simulator.animated.transition.id === stateTransition.id) {
                        animatedCurrentState = true;
                    }
                    if (animatedCurrentState || selectedTransition) {
                        stringStateTransitions = '(<span class=" ' + (animatedCurrentState ? 'animated-transition' : '') + ' ' + (selectedTransition ? 'selected' : '') + '">';
                    } else {
                        stringStateTransitions = '(<span>';
                    }
                    stringStateTransitions += $scope.getStateById(stateTransition.fromState).name + ', ';
                    stringStateTransitions += stateTransition.name + ', ';
                    stringStateTransitions += $scope.getStateById(stateTransition.toState).name + '</span>)';

                    self.functionData.statetransitionfunction.push(stringStateTransitions);
                }
            });
        });


        //Update of Startstate
        startState = $scope.getStateById($scope.config.startState);
        if (startState !== undefined) {
            stringStartState += '<span class="">' + startState.name + '</span>';
        }

        self.functionData.startState = stringStartState;

        //Update of Finalstates
        _.forEach($scope.config.finalStates, function (finalState, key) {
            finalState = $scope.getStateById(finalState);
            stringFinalStates = finalState.name;
            if (key < $scope.config.finalStates.length - 1) {
                stringFinalStates += ', ';
            }
        });

        self.functionData.finalStates = stringFinalStates;

    };


    /**************
     **SIMULATION**
     *************/

    $scope.$watch('simulator.animated.currentState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('simulator.animated.transition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedTransition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });
    $scope.$watch('simulator.status', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });
}
//TableDFA
function TableDFA($scope) {
    var self = this;
    self.states = [];
    $scope.updateListeners.push(self);


    self.updateFunction = function () {
        self.states = [];
        self.alphabet = [];
        var dfa = $scope.config;



        var alphabetCounter;

        //prepare alphabet
        _.forEach($scope.config.alphabet, function (character, key) {
            var selectedTrans = "";
            if ($scope.statediagram.selectedTransition !== null && _.find($scope.statediagram.selectedTransition.names, {
                    name: character
                }) !== undefined) {
                selectedTrans = "selected";
            }

            var tmp;
            if ($scope.simulator.animated.transition && $scope.simulator.animated.transition.name === character) {
                tmp = '<span class="animated-transition ' + selectedTrans + '">' + character + '</span>';
            } else {
                tmp = '<span class="' + selectedTrans + '">' + character + '</span>';
            }
            self.alphabet.push(tmp);
        });

        // iterates over all States
        _.forEach($scope.config.states, function (state, key) {


            var tmpObject = {};
            tmpObject.id = state.id;
            // marks the current active state at the simulation in the table
            var selectedClass = "";
            if (($scope.statediagram.selectedState !== null && $scope.statediagram.selectedState.id == state.id) || ($scope.statediagram.selectedTransition !== null && $scope.statediagram.selectedTransition.fromState === state.id)) {
                selectedClass = "selected";
            }
            if ($scope.simulator.animated.currentState == state.id) {
                var animatedClass = "";
                if ($scope.simulator.status === "accepted") {
                    animatedClass = "animated-accepted";
                } else if ($scope.simulator.status === "not accepted") {
                    animatedClass = "animated-not-accepted";
                } else {
                    animatedClass = "animated-currentstate";
                }

                tmpObject.name = '<span class="' + animatedClass + ' ' + selectedClass + '">' + state.name + '</span>';
            } else {
                tmpObject.name = '<span class="' + selectedClass + '">' + state.name + '</span>';
            }

            if ($scope.isStateAFinalState(state.id))
                tmpObject.finalState = true;
            else
                tmpObject.finalState = false;

            if ($scope.config.startState === state.id)
                tmpObject.startState = true;
            else
                tmpObject.startState = false;

            tmpObject.trans = [];


            // iterates over all aplphabet 
            _.forEach($scope.config.alphabet, function (character, key) {
                var foundTransition = null;

                // iterates over the available transitions and saves found transitions
                _.forEach($scope.config.transitions, function (transition, key) {
                    if (transition.fromState === state.id && transition.name === character) {
                        foundTransition = transition;
                    }
                });

                var trans = {};
                trans.alphabet = character;

                // saves the found Transition in "Trans.State"
                if (foundTransition !== null) {
                    var tmpToState = $scope.getStateById(foundTransition.toState);
                    var selectedTrans = "";
                    if ($scope.statediagram.selectedTransition !== null && $scope.statediagram.selectedTransition.toState === tmpToState.id) {
                        selectedTrans = "selected";
                    }
                    if ($scope.simulator.animated.nextState == tmpToState.id && foundTransition.name == $scope.simulator.animated.transition.name) {
                        trans.State = '<span class="animated-nextstate ' + selectedTrans + '">' + tmpToState.name + '</span>';
                    } else {
                        trans.State = '<span class="' + selectedTrans + '">' + tmpToState.name + '</span>';
                    }
                } else {
                    trans.State = "";
                }

                tmpObject.trans.push(trans);
            });
            self.states.push(tmpObject);

        });

    };


    /**************
     **SIMULATION**
     *************/

    $scope.$watch('simulator.animated.currentState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('simulator.animated.transition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });
    $scope.$watch('simulator.animated.nextState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedTransition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

}
function DFA(t,e){"use strict";window.debugScope=t,t.defaultConfig={},t.defaultConfig.statePrefix="S",t.defaultConfig.transitionNameSuffix="|",t.defaultConfig.diagramm={x:0,y:0,scale:1,updatedWithZoomBehavior:!1},t.defaultConfig.countStateId=0,t.defaultConfig.countTransitionId=0,t.defaultConfig.states=[],t.defaultConfig.startState=null,t.defaultConfig.finalStates=[],t.defaultConfig.transitions=[],t.defaultConfig.alphabet=[],t.defaultConfig.inputWord="",t.defaultConfig.name="Untitled Automaton",t.defaultConfig.unSavedChanges=!1,t.defaultConfig.drawnTransitions=[],t.config=cloneObject(t.defaultConfig),t.updateListeners=[],t.simulator=new SimulationDFA(t),t.table=new TableDFA(t),t.statediagram=new StateDiagramDFA(t,"#diagramm-svg"),t.statetransitionfunction=new StatetransitionfunctionDFA(t),t.testData=new TestData(t),t.inNameEdit=!1,t.showModalWithMessage=function(e,a,n,i){t.title=e,t.description=a,t.modalAction=n,void 0===i?t.button="MODAL_BUTTON.PROCEED":t.button=i,$("#modal").modal()},t.executeModalAction=function(){t.$eval(t.modalAction)},t.stepTimeOutSlider={options:{floor:0,step:100,ceil:3e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.loopTimeOutSlider={options:{floor:0,step:100,ceil:4e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.keypressCallback=function(t){13==t.charCode&&document.getElementById("automatonNameEdit").blur()},window.onbeforeunload=function(e){if(t.config.unSavedChanges){var a="All Changes will be Lost. Save before continue!";return"undefined"==typeof e&&(e=window.event),e&&(e.returnValue=a),a}},t.saveAutomaton=function(){t.config.unSavedChanges=!1},t.safeApply=function(t){var e=this.$root.$$phase;"$apply"==e||"$digest"==e?t&&"function"==typeof t&&t():this.$apply(t)},t.resetAutomaton=function(){t.statediagram.clearSvgContent(),t.simulator.reset(),t.config=cloneObject(t.defaultConfig),t.safeApply(),t.updateListener()},t.addToAlphabet=function(e){_.some(t.config.alphabet,function(t){return t===e})||t.config.alphabet.push(e)},t.removeFromAlphabetIfNotUsedFromOthers=function(e){for(var a=t.getTransitionById(e),n=!1,i=0;i<t.config.transitions.length;i++)if(a.name===t.config.transitions[i].name&&t.config.transitions[i].id!==e)return void(n=!0);return n?!1:(_.pull(t.config.alphabet,a.name),!0)},t.updateListener=function(){_.forEach(t.updateListeners,function(t,e){t.updateFunction()}),t.config.unSavedChanges=!0},t.existsStateWithName=function(e,a){var n=!1;return _.forEach(t.config.states,function(t){return t.name==e&&t.id!==a?void(n=!0):void 0}),n},t.existsStateWithId=function(e){for(var a=0;a<t.config.states.length;a++)if(t.config.states[a].id==e)return!0;return!1},t.hasStateTransitions=function(e){var a=!1;return _.forEach(t.config.transitions,function(t){t.fromState!=e&&t.toState!=e||(a=!0)}),a},t.getArrayStateIdByStateId=function(e){return _.findIndex(t.config.states,function(t){return t.id==e?t:void 0})},t.getStateById=function(e){return t.config.states[t.getArrayStateIdByStateId(e)]},t.getStateByName=function(e){return t.config.states[t.getArrayStateIdByStateId(function(t){})]},t.addStateWithPresets=function(e,a){var n=t.addState(t.config.statePrefix+t.config.countStateId,e,a);return 1==t.config.countStateId&&t.changeStartState(0),n},t.addState=function(e,a,n){return t.existsStateWithName(e)?null:t.addStateWithId(t.config.countStateId++,e,a,n)},t.addStateWithId=function(e,a,n,i){t.config.states.push(new State(e,a,n,i));return t.statediagram.drawState(e),t.updateListener(),t.safeApply(),t.getStateById(e)},t.removeState=function(e){t.hasStateTransitions(e)?t.showModalWithMessage("STATE_MENU.DELETE_MODAL_TITLE","STATE_MENU.DELETE_MODAL_DESC","forcedRemoveState("+e+")","MODAL_BUTTON.DELETE"):(t.isStateAFinalState(e)&&t.removeFinalState(e),t.config.startState==e&&(t.config.startState=null),t.statediagram.removeState(e),t.config.states.splice(t.getArrayStateIdByStateId(e),1),t.updateListener())},t.forcedRemoveState=function(e){for(var a=0;a<t.config.transitions.length;a++){var n=t.config.transitions[a];n.fromState!==e&&n.toState!==e||(t.removeTransition(n.id),a--)}t.removeState(e)},t.renameState=function(e,a){return t.existsStateWithName(a)?!1:(t.getStateById(e).name=a,t.statediagram.renameState(e,a),t.updateListener(),!0)},t.changeStartState=function(e){t.existsStateWithId(e)&&(t.statediagram.changeStartState(e),t.config.startState=e,t.updateListener())},t.removeStartState=function(){null!==t.config.startState&&(t.statediagram.removeStartState(),t.updateListener(),t.config.startState=null)},t.getFinalStateIndexByStateId=function(e){return _.indexOf(t.config.finalStates,e)},t.isStateAFinalState=function(e){for(var a=0;a<t.config.finalStates.length;a++)if(t.config.finalStates[a]==e)return!0;return!1},t.addFinalState=function(e){t.isStateAFinalState(e)||(t.config.finalStates.push(e),t.statediagram.addFinalState(e),t.updateListener())},t.removeFinalState=function(e){t.isStateAFinalState(e)&&(t.statediagram.removeFinalState(e),t.updateListener(),t.config.finalStates.splice(t.getFinalStateIndexByStateId(e),1))},t.existsTransition=function(e,a,n,i){for(var r=!1,s=0;s<t.config.transitions.length;s++){var o=t.config.transitions[s];o.fromState==e&&o.name==n&&o.id!==i&&(r=!0)}return r},t.getNextTransitionName=function(e){for(var a=[],n=0;n<t.config.transitions.length;n++)t.config.transitions[n].fromState==e&&a.push(t.config.transitions[n].name);for(var i=!1,r="a";!i;){var s=_.indexOf(a,r);-1===s?i=!0:r=String.fromCharCode(r.charCodeAt()+1)}return r},t.addTransition=function(e,a,n){return!t.existsTransition(e,a,n)&&t.existsStateWithId(e)&&t.existsStateWithId(a)?(t.addToAlphabet(n),t.addTransitionWithId(t.config.countTransitionId++,e,a,n)):void 0},t.addTransitionWithId=function(e,a,n,i){return t.config.transitions.push(new TransitionDFA(e,a,n,i)),t.statediagram.drawTransition(e),t.updateListener(),t.safeApply(),t.getTransitionById(e)},t.getArrayTransitionIdByTransitionId=function(e){return _.findIndex(t.config.transitions,function(t){return t.id==e?t:void 0})},t.getTransitionById=function(e){return t.config.transitions[t.getArrayTransitionIdByTransitionId(e)]},t.getTransition=function(e,a,n){for(var i=0;i<t.config.transitions.length;i++){var r=t.config.transitions[i];if(r.fromState==e&&r.toState==a&&r.name==n)return r}},t.removeTransition=function(e){t.removeFromAlphabetIfNotUsedFromOthers(e),t.statediagram.removeTransition(e),t.config.transitions.splice(t.getArrayTransitionIdByTransitionId(e),1),t.updateListener()},t.renameTransition=function(e,a){var n=t.getTransitionById(e);if(t.existsTransition(n.fromState,n.toState,a))return!1;t.getTransitionById(e);return t.removeFromAlphabetIfNotUsedFromOthers(e),t.addToAlphabet(a),t.getTransitionById(e).name=a,t.statediagram.renameTransition(n.fromState,n.toState,e,a),t.updateListener(),!0}}function DFA(t,e){"use strict";window.debugScope=t,t.defaultConfig={},t.defaultConfig.statePrefix="S",t.defaultConfig.transitionNameSuffix="|",t.defaultConfig.diagramm={x:0,y:0,scale:1,updatedWithZoomBehavior:!1},t.defaultConfig.countStateId=0,t.defaultConfig.countTransitionId=0,t.defaultConfig.states=[],t.defaultConfig.startState=null,t.defaultConfig.finalStates=[],t.defaultConfig.transitions=[],t.defaultConfig.alphabet=[],t.defaultConfig.inputWord="",t.defaultConfig.name="Untitled Automaton",t.defaultConfig.unSavedChanges=!1,t.defaultConfig.drawnTransitions=[],t.config=cloneObject(t.defaultConfig),t.updateListeners=[],t.simulator=new SimulationDFA(t),t.table=new TableDFA(t),t.statediagram=new StateDiagramDFA(t,"#diagramm-svg"),t.statetransitionfunction=new StatetransitionfunctionDFA(t),t.testData=new TestData(t),t.inNameEdit=!1,t.showModalWithMessage=function(e,a,n,i){t.title=e,t.description=a,t.modalAction=n,void 0===i?t.button="MODAL_BUTTON.PROCEED":t.button=i,$("#modal").modal()},t.executeModalAction=function(){t.$eval(t.modalAction)},t.stepTimeOutSlider={options:{floor:0,step:100,ceil:3e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.loopTimeOutSlider={options:{floor:0,step:100,ceil:4e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.keypressCallback=function(t){13==t.charCode&&document.getElementById("automatonNameEdit").blur()},window.onbeforeunload=function(e){if(t.config.unSavedChanges){var a="All Changes will be Lost. Save before continue!";return"undefined"==typeof e&&(e=window.event),e&&(e.returnValue=a),a}},t.saveAutomaton=function(){t.config.unSavedChanges=!1},t.safeApply=function(t){var e=this.$root.$$phase;"$apply"==e||"$digest"==e?t&&"function"==typeof t&&t():this.$apply(t)},t.resetAutomaton=function(){t.statediagram.clearSvgContent(),t.simulator.reset(),t.config=cloneObject(t.defaultConfig),t.safeApply(),t.updateListener()},t.addToAlphabet=function(e){_.some(t.config.alphabet,function(t){return t===e})||t.config.alphabet.push(e)},t.removeFromAlphabetIfNotUsedFromOthers=function(e){for(var a=t.getTransitionById(e),n=!1,i=0;i<t.config.transitions.length;i++)if(a.name===t.config.transitions[i].name&&t.config.transitions[i].id!==e)return void(n=!0);return n?!1:(_.pull(t.config.alphabet,a.name),!0)},t.updateListener=function(){_.forEach(t.updateListeners,function(t,e){t.updateFunction()}),t.config.unSavedChanges=!0},t.existsStateWithName=function(e,a){var n=!1;return _.forEach(t.config.states,function(t){return t.name==e&&t.id!==a?void(n=!0):void 0}),n},t.existsStateWithId=function(e){for(var a=0;a<t.config.states.length;a++)if(t.config.states[a].id==e)return!0;return!1},t.hasStateTransitions=function(e){var a=!1;return _.forEach(t.config.transitions,function(t){t.fromState!=e&&t.toState!=e||(a=!0)}),a},t.getArrayStateIdByStateId=function(e){return _.findIndex(t.config.states,function(t){return t.id==e?t:void 0})},t.getStateById=function(e){return t.config.states[t.getArrayStateIdByStateId(e)]},t.getStateByName=function(e){return t.config.states[t.getArrayStateIdByStateId(function(t){})]},t.addStateWithPresets=function(e,a){var n=t.addState(t.config.statePrefix+t.config.countStateId,e,a);return 1==t.config.countStateId&&t.changeStartState(0),n},t.addState=function(e,a,n){return t.existsStateWithName(e)?null:t.addStateWithId(t.config.countStateId++,e,a,n)},t.addStateWithId=function(e,a,n,i){t.config.states.push(new State(e,a,n,i));return t.statediagram.drawState(e),t.updateListener(),t.safeApply(),t.getStateById(e)},t.removeState=function(e){t.hasStateTransitions(e)?t.showModalWithMessage("STATE_MENU.DELETE_MODAL_TITLE","STATE_MENU.DELETE_MODAL_DESC","forcedRemoveState("+e+")","MODAL_BUTTON.DELETE"):(t.isStateAFinalState(e)&&t.removeFinalState(e),t.config.startState==e&&(t.config.startState=null),t.statediagram.removeState(e),t.config.states.splice(t.getArrayStateIdByStateId(e),1),t.updateListener())},t.forcedRemoveState=function(e){for(var a=0;a<t.config.transitions.length;a++){var n=t.config.transitions[a];n.fromState!==e&&n.toState!==e||(t.removeTransition(n.id),a--)}t.removeState(e)},t.renameState=function(e,a){return t.existsStateWithName(a)?!1:(t.getStateById(e).name=a,t.statediagram.renameState(e,a),t.updateListener(),!0)},t.changeStartState=function(e){t.existsStateWithId(e)&&(t.statediagram.changeStartState(e),t.config.startState=e,t.updateListener())},t.removeStartState=function(){null!==t.config.startState&&(t.statediagram.removeStartState(),t.updateListener(),t.config.startState=null)},t.getFinalStateIndexByStateId=function(e){return _.indexOf(t.config.finalStates,e)},t.isStateAFinalState=function(e){for(var a=0;a<t.config.finalStates.length;a++)if(t.config.finalStates[a]==e)return!0;return!1},t.addFinalState=function(e){t.isStateAFinalState(e)||(t.config.finalStates.push(e),t.statediagram.addFinalState(e),t.updateListener())},t.removeFinalState=function(e){t.isStateAFinalState(e)&&(t.statediagram.removeFinalState(e),t.updateListener(),t.config.finalStates.splice(t.getFinalStateIndexByStateId(e),1))},t.existsTransition=function(e,a,n,i){for(var r=!1,s=0;s<t.config.transitions.length;s++){var o=t.config.transitions[s];o.fromState==e&&o.name==n&&o.id!==i&&(r=!0)}return r},t.getNextTransitionName=function(e){for(var a=[],n=0;n<t.config.transitions.length;n++)t.config.transitions[n].fromState==e&&a.push(t.config.transitions[n].name);for(var i=!1,r="a";!i;){var s=_.indexOf(a,r);-1===s?i=!0:r=String.fromCharCode(r.charCodeAt()+1)}return r},t.addTransition=function(e,a,n){return!t.existsTransition(e,a,n)&&t.existsStateWithId(e)&&t.existsStateWithId(a)?(t.addToAlphabet(n),t.addTransitionWithId(t.config.countTransitionId++,e,a,n)):void 0},t.addTransitionWithId=function(e,a,n,i){return t.config.transitions.push(new TransitionDFA(e,a,n,i)),t.statediagram.drawTransition(e),t.updateListener(),t.safeApply(),t.getTransitionById(e)},t.getArrayTransitionIdByTransitionId=function(e){return _.findIndex(t.config.transitions,function(t){return t.id==e?t:void 0})},t.getTransitionById=function(e){return t.config.transitions[t.getArrayTransitionIdByTransitionId(e)]},t.getTransition=function(e,a,n){for(var i=0;i<t.config.transitions.length;i++){var r=t.config.transitions[i];if(r.fromState==e&&r.toState==a&&r.name==n)return r}},t.removeTransition=function(e){t.removeFromAlphabetIfNotUsedFromOthers(e),t.statediagram.removeTransition(e),t.config.transitions.splice(t.getArrayTransitionIdByTransitionId(e),1),t.updateListener()},t.renameTransition=function(e,a){var n=t.getTransitionById(e);if(t.existsTransition(n.fromState,n.toState,a))return!1;t.getTransitionById(e);return t.removeFromAlphabetIfNotUsedFromOthers(e),t.addToAlphabet(a),t.getTransitionById(e).name=a,t.statediagram.renameTransition(n.fromState,n.toState,e,a),t.updateListener(),!0}}function DFA(t,e){"use strict";window.debugScope=t,t.defaultConfig={},t.defaultConfig.statePrefix="S",t.defaultConfig.transitionNameSuffix="|",t.defaultConfig.diagramm={x:0,y:0,scale:1,updatedWithZoomBehavior:!1},t.defaultConfig.countStateId=0,t.defaultConfig.countTransitionId=0,t.defaultConfig.states=[],t.defaultConfig.startState=null,t.defaultConfig.finalStates=[],t.defaultConfig.transitions=[],t.defaultConfig.alphabet=[],t.defaultConfig.inputWord="",t.defaultConfig.name="Untitled Automaton",t.defaultConfig.unSavedChanges=!1,t.defaultConfig.drawnTransitions=[],t.config=cloneObject(t.defaultConfig),t.updateListeners=[],t.simulator=new SimulationDFA(t),t.table=new TableDFA(t),t.statediagram=new StateDiagramDFA(t,"#diagramm-svg"),t.statetransitionfunction=new StatetransitionfunctionDFA(t),t.testData=new TestData(t),t.inNameEdit=!1,t.showModalWithMessage=function(e,a,n,i){t.title=e,t.description=a,t.modalAction=n,void 0===i?t.button="MODAL_BUTTON.PROCEED":t.button=i,$("#modal").modal()},t.executeModalAction=function(){t.$eval(t.modalAction)},t.stepTimeOutSlider={options:{floor:0,step:100,ceil:3e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.loopTimeOutSlider={options:{floor:0,step:100,ceil:4e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.keypressCallback=function(t){13==t.charCode&&document.getElementById("automatonNameEdit").blur()},window.onbeforeunload=function(e){if(t.config.unSavedChanges){var a="All Changes will be Lost. Save before continue!";return"undefined"==typeof e&&(e=window.event),e&&(e.returnValue=a),a}},t.saveAutomaton=function(){t.config.unSavedChanges=!1},t.safeApply=function(t){var e=this.$root.$$phase;"$apply"==e||"$digest"==e?t&&"function"==typeof t&&t():this.$apply(t)},t.resetAutomaton=function(){t.statediagram.clearSvgContent(),t.simulator.reset(),t.config=cloneObject(t.defaultConfig),t.safeApply(),t.updateListener()},t.addToAlphabet=function(e){_.some(t.config.alphabet,function(t){return t===e})||t.config.alphabet.push(e)},t.removeFromAlphabetIfNotUsedFromOthers=function(e){for(var a=t.getTransitionById(e),n=!1,i=0;i<t.config.transitions.length;i++)if(a.name===t.config.transitions[i].name&&t.config.transitions[i].id!==e)return void(n=!0);return n?!1:(_.pull(t.config.alphabet,a.name),!0)},t.updateListener=function(){_.forEach(t.updateListeners,function(t,e){t.updateFunction()}),t.config.unSavedChanges=!0},t.existsStateWithName=function(e,a){var n=!1;return _.forEach(t.config.states,function(t){return t.name==e&&t.id!==a?void(n=!0):void 0}),n},t.existsStateWithId=function(e){for(var a=0;a<t.config.states.length;a++)if(t.config.states[a].id==e)return!0;return!1},t.hasStateTransitions=function(e){var a=!1;return _.forEach(t.config.transitions,function(t){t.fromState!=e&&t.toState!=e||(a=!0)}),a},t.getArrayStateIdByStateId=function(e){return _.findIndex(t.config.states,function(t){return t.id==e?t:void 0})},t.getStateById=function(e){return t.config.states[t.getArrayStateIdByStateId(e)]},t.getStateByName=function(e){return t.config.states[t.getArrayStateIdByStateId(function(t){})]},t.addStateWithPresets=function(e,a){var n=t.addState(t.config.statePrefix+t.config.countStateId,e,a);return 1==t.config.countStateId&&t.changeStartState(0),n},t.addState=function(e,a,n){return t.existsStateWithName(e)?null:t.addStateWithId(t.config.countStateId++,e,a,n)},t.addStateWithId=function(e,a,n,i){t.config.states.push(new State(e,a,n,i));return t.statediagram.drawState(e),t.updateListener(),t.safeApply(),t.getStateById(e)},t.removeState=function(e){t.hasStateTransitions(e)?t.showModalWithMessage("STATE_MENU.DELETE_MODAL_TITLE","STATE_MENU.DELETE_MODAL_DESC","forcedRemoveState("+e+")","MODAL_BUTTON.DELETE"):(t.isStateAFinalState(e)&&t.removeFinalState(e),t.config.startState==e&&(t.config.startState=null),t.statediagram.removeState(e),t.config.states.splice(t.getArrayStateIdByStateId(e),1),t.updateListener())},t.forcedRemoveState=function(e){for(var a=0;a<t.config.transitions.length;a++){var n=t.config.transitions[a];n.fromState!==e&&n.toState!==e||(t.removeTransition(n.id),a--)}t.removeState(e)},t.renameState=function(e,a){return t.existsStateWithName(a)?!1:(t.getStateById(e).name=a,t.statediagram.renameState(e,a),t.updateListener(),!0)},t.changeStartState=function(e){t.existsStateWithId(e)&&(t.statediagram.changeStartState(e),t.config.startState=e,t.updateListener())},t.removeStartState=function(){null!==t.config.startState&&(t.statediagram.removeStartState(),t.updateListener(),t.config.startState=null)},t.getFinalStateIndexByStateId=function(e){return _.indexOf(t.config.finalStates,e)},t.isStateAFinalState=function(e){for(var a=0;a<t.config.finalStates.length;a++)if(t.config.finalStates[a]==e)return!0;return!1},t.addFinalState=function(e){t.isStateAFinalState(e)||(t.config.finalStates.push(e),t.statediagram.addFinalState(e),t.updateListener())},t.removeFinalState=function(e){t.isStateAFinalState(e)&&(t.statediagram.removeFinalState(e),t.updateListener(),t.config.finalStates.splice(t.getFinalStateIndexByStateId(e),1))},t.existsTransition=function(e,a,n,i){for(var r=!1,s=0;s<t.config.transitions.length;s++){var o=t.config.transitions[s];o.fromState==e&&o.name==n&&o.id!==i&&(r=!0)}return r},t.getNextTransitionName=function(e){for(var a=[],n=0;n<t.config.transitions.length;n++)t.config.transitions[n].fromState==e&&a.push(t.config.transitions[n].name);for(var i=!1,r="a";!i;){var s=_.indexOf(a,r);-1===s?i=!0:r=String.fromCharCode(r.charCodeAt()+1)}return r},t.addTransition=function(e,a,n){return!t.existsTransition(e,a,n)&&t.existsStateWithId(e)&&t.existsStateWithId(a)?(t.addToAlphabet(n),t.addTransitionWithId(t.config.countTransitionId++,e,a,n)):void 0},t.addTransitionWithId=function(e,a,n,i){return t.config.transitions.push(new TransitionDFA(e,a,n,i)),t.statediagram.drawTransition(e),t.updateListener(),t.safeApply(),t.getTransitionById(e)},t.getArrayTransitionIdByTransitionId=function(e){return _.findIndex(t.config.transitions,function(t){return t.id==e?t:void 0})},t.getTransitionById=function(e){return t.config.transitions[t.getArrayTransitionIdByTransitionId(e)]},t.getTransition=function(e,a,n){for(var i=0;i<t.config.transitions.length;i++){var r=t.config.transitions[i];if(r.fromState==e&&r.toState==a&&r.name==n)return r}},t.removeTransition=function(e){t.removeFromAlphabetIfNotUsedFromOthers(e),t.statediagram.removeTransition(e),t.config.transitions.splice(t.getArrayTransitionIdByTransitionId(e),1),t.updateListener()},t.renameTransition=function(e,a){var n=t.getTransitionById(e);if(t.existsTransition(n.fromState,n.toState,a))return!1;t.getTransitionById(e);return t.removeFromAlphabetIfNotUsedFromOthers(e),t.addToAlphabet(a),t.getTransitionById(e).name=a,t.statediagram.renameTransition(n.fromState,n.toState,e,a),t.updateListener(),!0}}function SimulationDFA(t){"use strict";var e=this;e.isInPlay=!1,e.loopSimulation=!0,e.stepTimeOut=1500,e.loopTimeOut=2e3,e.simulationPaused=!1,e.simulationSettings=!0,e.currentState=null,e.nextState=null,e.transition=null,e.isInputAccepted=!1,e.settings=function(){e.simulationSettings=!e.simulationSettings},e.animated={currentState:null,transition:null,nextState:null},e.reset=function(){e.animated={currentState:null,transition:null,nextState:null},e.goneTransitions=[],e.currentState=t.config.startState,e.transition=null,e.animatedTransition=!1,e.nextState=null,e.animatedNextState=!1,e.isNextStepCalculated=!1,e.simulationStarted=!1,e.statusSequence=[t.config.startState],e.madeSteps=0,e.inputWord=t.config.inputWord,e.processedWord="",e.nextChar="",e.status="stopped"},e.pause=function(){e.simulationPaused||(e.simulationPaused=!0,e.isInPlay=!1)},e.stop=function(){e.pause(),e.reset()},e.play=function(){e.simulationPaused||(e.simulationStarted?((e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&(e.animateNextMove(),t.safeApply(function(){}),(e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&setTimeout(e.play,e.stepTimeOut)),e.isNextStepCalculated||"accepted"!=e.status||(e.loopSimulation?setTimeout(e.play,e.loopTimeOut):e.isInPlay=!1,e.simulationStarted=!1,t.safeApply(function(){}))):e.prepareSimulation())},e.prepareSimulation=function(){e.reset(),e.simulationStarted=!0,e.animated.currentState=_.last(e.statusSequence),t.safeApply(),setTimeout(e.play,e.loopTimeOut)},e.animateNextMove=function(){e.isNextStepCalculated||e.calcNextStep(),e.animatedTransition?!e.animatedNextState&&e.animatedTransition?(e.animatedNextState=!0,e.animated.nextState=e.nextState):e.animatedTransition&&e.animatedNextState&&(e.animated.transition=null,e.animated.nextState=null,e.animated.currentState=e.nextState,e.currentState=e.nextState,e.madeSteps++,e.inputWord.length==e.madeSteps&&(_.include(t.config.finalStates,e.currentState)?e.status="accepted":e.status="not accepted"),e.isNextStepCalculated=!1,e.animatedNextState=!1,e.animatedTransition=!1,e.processedWord+=e.nextChar,e.statusSequence.push(e.currentState),"accepted"!==e.status&&"not accepted"!==e.status&&e.calcNextStep()):(e.animatedTransition=!0,e.animated.transition=e.transition,e.goneTransitions.push(e.transition))},e.calcNextStep=function(){return e.isNextStepCalculated=!0,e.status="step",e.nextChar=e.inputWord[e.madeSteps],e.transition=_.filter(t.config.transitions,function(t){return void 0===e.nextChar?void(e.status="not accepted"):t.fromState==_.last(e.statusSequence)&&t.name==e.nextChar}),_.isEmpty(e.transition)?(e.transition=null,void(e.status="not accepted")):(e.transition=e.transition[0],void(e.nextState=e.transition.toState))},e.stepForward=function(){if(e.simulationPaused||e.pause(),e.simulationStarted){if(!_.include(["step","stopped","accepted","not accepted"],e.status))return void console.log(e.status);_.include(["accepted","not accepted"],e.status)||e.animateNextMove()}else e.prepareSimulation(),e.status="step"},e.stepBackward=function(){e.simulationPaused||e.pause(),_.include(["step","accepted","not accepted"],e.status)&&(e.status="step",e.animatedTransition||e.animatedNextState||0!==e.madeSteps?e.animateLastMove():e.reset())},e.animateLastMove=function(){console.log(e.animatedTransition+" "+e.animatedNextState),e.animatedTransition&&e.animatedNextState?(e.animated.nextState=null,e.animatedNextState=!1):e.animatedTransition?(e.animated.transition=null,e.animatedTransition=!1,e.goneTransitions.pop()):e.calcLastStep()},e.calcLastStep=function(){e.nextChar=e.processedWord.slice(-1),console.log(e.nextChar+" "+e.statusSequence[e.statusSequence.length-2]),e.transition=_.last(e.goneTransitions),console.log(e.transition),_.pullAt(e.goneTransitions,e.goneTransitions.length),e.animatedTransition=!0,e.animated.transition=e.transition;var t=e.currentState;e.currentState=e.transition.fromState,e.nextState=t,e.animated.nextState=e.nextState,e.animatedNextState=!0,e.animated.currentState=e.currentState,e.madeSteps--,e.statusSequence.splice(-1,1),e.processedWord=e.processedWord.slice(0,-1)},e.getNextTransition=function(e,a){for(var n=0;n<t.config.transitions.length;n++){var i=t.config.transitions[n];if(i.fromState==e&&i.name==a)return i}},e.check=function(){var a=!1,n=[];n.push(t.config.startState);for(var i="",r=0,s=null;r<=t.config.inputWord.length&&(i=t.config.inputWord[r],s=e.getNextTransition(_.last(n),i),!_.isEmpty(s));)if(n.push(s.toState),r++,t.config.inputWord.length==r){if(_.include(t.config.finalStates,_.last(n))){a=!0;break}break}return a},e.isPlayable=function(){return t.config.states.length>=1&&t.config.transitions.length>=1&&null!==t.config.startState&&t.config.finalStates.length>=1},e.playOrPause=function(){e.isPlayable()&&(e.isInPlay=!e.isInPlay,e.isInPlay?(e.simulationPaused=!1,e.play()):e.pause())},t.updateListeners.push(e),e.updateFunction=function(){e.isInputAccepted=e.check()}}function StateDiagramDFA(t,e){"use strict";function a(t,e){var a={x:t.y*e.z,y:-t.x*e.z};return a}function n(t){return t*(180/Math.PI)}function i(t){return t*(Math.PI/180)}function r(t,e){return{x:t.x*e,y:t.y*e}}function s(t){var e=1/Math.sqrt(t.x*t.x+t.y*t.y);return{x:t.x*e,y:t.y*e}}function o(t,e){var a=(t.x*e.x+t.y*e.y)/(Math.sqrt(t.x*t.x+t.y*t.y)*Math.sqrt(e.x*e.x+e.y*e.y)),i=Math.acos(a);return{val:a,rad:i,degree:n(i)}}function c(t,e){var a=t.x*e.x+t.y*e.y,n=t.x*e.y-t.y*e.x;return Math.atan2(n,a)}function d(t,e){var a=n(c(t,e));0>a&&(a+=360);var i=a+g;i>360&&(i-=360);var r=a-g;return 0>r&&(r+=360),{angle:a,lowerAngle:r,upperAngle:i}}var l=this;l.preventStateDragging=!1,l.inAddTransition=!1,l.selectedState=null,l.preventSvgOuterClick=!1,l.selectedTransition=null,l.showStateMenu=!1,l.showTransitionMenu=!1,l.selectedStateName="selectedForTransition",l.snapping=!0,l.settings={stateRadius:25,finalStateRadius:29,selected:!1};var u=40,f=18;l.stateSelfReferenceNumber=Math.sin(45*(Math.PI/180))*l.settings.stateRadius,l.existsDrawnTransition=function(e,a){for(var n=!1,i=0;i<t.config.drawnTransitions.length;i++){var r=t.config.drawnTransitions[i];r.fromState==e&&r.toState==a&&(n=!0)}return n},l.getDrawnTransition=function(e,a){for(var n=0;n<t.config.drawnTransitions.length;n++){var i=t.config.drawnTransitions[n];if(i.fromState==e&&i.toState==a)return i}},l.clearSvgContent=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgTransitions.html(""),l.svgStates.html(""),t.config.drawnTransitions=[],l.svg.attr("transform","translate("+t.defaultConfig.diagramm.x+","+t.defaultConfig.diagramm.y+") scale("+t.defaultConfig.diagramm.scale+")"),m.scale(t.defaultConfig.diagramm.scale),m.translate([t.defaultConfig.diagramm.x,t.defaultConfig.diagramm.y])},l.zoomMax=2.5,l.zoomMin=.5,l.zoomValue=.1,l.zoomIn=function(){t.config.diagramm.scale=t.config.diagramm.scale+l.zoomValue>l.zoomMax?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale+l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomOut=function(){t.config.diagramm.scale=t.config.diagramm.scale-l.zoomValue<=l.zoomMin?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale-l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomTo=function(e){console.log("zoomtedto"),t.config.diagramm.scale=e/100,t.safeApply(),l.updateZoomBehaviour()},l.updateZoomBehaviour=function(){t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")"),m.scale(t.config.diagramm.scale),m.translate([t.config.diagramm.x,t.config.diagramm.y])},l.zoomFitWindow=function(){var e,a=[],n=[],i=0,r=0,s=0,o=0,c=0,d=0,u=l.svgOuter.style("width").replace("px",""),f=l.svgOuter.style("height").replace("px","");if(t.config.diagramm.scale=1,t.config.states.length>0){for(e=0;e<t.config.states.length;e++)a[e]=t.config.states[e].x;for(e=0;e<t.config.states.length;e++)n[e]=t.config.states[e].y;for(i=_.min(a),r=_.max(a),s=_.min(n),o=_.max(n);r-i+150>u/t.config.diagramm.scale||o-s+200>f/t.config.diagramm.scale;)t.config.diagramm.scale-=.01;t.safeApply(),c=(f/t.config.diagramm.scale-(o-s))/2,d=(u/t.config.diagramm.scale-(r-i))/2,t.config.diagramm.x=-(i*t.config.diagramm.scale)+d*t.config.diagramm.scale,t.config.diagramm.y=-(s*t.config.diagramm.scale)+c*t.config.diagramm.scale,l.updateZoomBehaviour()}else l.scaleAndTranslateToDefault()},l.scaleAndTranslateToDefault=function(){t.config.diagramm.scale=t.defaultConfig.diagramm.scale,t.config.diagramm.x=t.defaultConfig.diagramm.x,t.config.diagramm.y=t.defaultConfig.diagramm.y,t.safeApply(),l.updateZoomBehaviour()};var m=d3.behavior.zoom().scaleExtent([l.zoomMin,l.zoomMax]).on("zoom",function(){var e=d3.event.button||d3.event.ctrlKey;if(e&&d3.event.stopImmediatePropagation(),3!==d3.event.sourceEvent.which){var a=Math.floor(100*d3.event.scale)/100;t.config.diagramm.scale=a,t.config.diagramm.x=d3.event.translate[0],t.config.diagramm.y=d3.event.translate[1],t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")")}else console.log("rightclick!")});l.svgOuter=d3.select(e).call(m).on("dblclick.zoom",null).on("contextmenu",function(){d3.event.preventDefault()}),l.addSvgOuterClickListener=function(){l.svgOuter.on("click",function(){l.preventSvgOuterClick?l.preventSvgOuterClick=!1:(l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply())})},l.addSvgOuterClickListener(),l.svgGrid=l.svgOuter.append("g").attr("id","grid"),l.svg=l.svgOuter.append("g").attr("id","svg-items"),l.svgTransitions=l.svg.append("g").attr("id","transitions"),l.svgStates=l.svg.append("g").attr("id","states"),l.gridSpace=100,l.gridSnapDistance=20,l.isGrid=!0,t.$watch("[statediagram.isGrid , config.diagramm]",function(){l.drawGrid()},!0),l.drawGrid=function(){if(l.isGrid){l.svgGrid.html("");var e,a=l.svgOuter.style("width").replace("px",""),n=l.svgOuter.style("height").replace("px",""),i=1*t.config.diagramm.scale*.5,r=t.config.diagramm.x%(l.gridSpace*t.config.diagramm.scale),s=t.config.diagramm.y%(l.gridSpace*t.config.diagramm.scale);for(e=r;a>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line xgrid-line").attr("x1",e).attr("y1",0).attr("x2",e).attr("y2",n);for(e=s;n>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line ygrid-line").attr("x1",0).attr("y1",e).attr("x2",a).attr("y2",e)}else l.svgGrid.html("")},l.defs=l.svg.append("svg:defs"),l.defs.append("svg:marker").attr("id","marker-end-arrow").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-create").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-animated").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-hover").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-selection").attr("refX",4).attr("refY",3).attr("markerWidth",5).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.resetAddActions=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgOuter.on("click",null),
l.inAddTransition=!1,l.inAddState=!1},l.addState=function(){l.resetAddActions(),l.svgOuter.on("mousemove",function(){l.selectedState.objReference.attr("transform","translate("+(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale)+" "+(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale)+")")}),l.selectedState=t.addStateWithPresets(-1e4,-1e4),l.selectedState.objReference.classed("state-in-creation",!0),l.svgOuter.on("click",function(){l.selectedState.objReference.classed("state-in-creation",!1),l.selectedState.x=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),l.selectedState.y=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),l.selectedState.objReference.attr("transform","translate("+l.selectedState.x+" "+l.selectedState.y+")"),l.svgOuter.on("mousemove",null),l.addSvgOuterClickListener(),l.preventSvgOuterClick=!1,t.safeApply()})},l.addTransition=function(){l.resetAddActions(),l.preventStateDragging=!0,d3.selectAll(".state").on("click",function(){if(l.mouseInState=!0,null===l.selectedState)l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.tmpTransition=l.svgTransitions.append("g").attr("class","transition"),l.tmpTransitionline=l.tmpTransition.append("path").attr("class","transition-line curvedLine in-creation").attr("marker-end","url(#marker-end-arrow-create)").attr("fill","none");else{var e=t.addTransition(l.selectedState.id,parseInt(d3.select(this).attr("object-id")),t.getNextTransitionName(l.selectedState.id));l.toggleState(l.selectedState.id,!1),l.tmpTransition.remove(),l.tmpTransition=null,l.tmpTransitionline=null,l.preventStateDragging=!1,l.addSvgOuterClickListener(),l.svgOuter.on("mousemove",null),d3.selectAll(".state").on("mouseover",null),d3.selectAll(".state").on("mouseleave",null),d3.selectAll(".state").on("click",l.openStateMenu),l.openTransitionMenu(e.id)}}),l.svgOuter.on("mousemove",function(){if(!l.mouseInState&&null!==l.selectedState){var e=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),a=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),n=l.bezierLine([[l.selectedState.x,l.selectedState.y],[e,a]]);l.tmpTransitionline.attr("d",n)}}),d3.selectAll(".state").on("mouseover",function(e){if(l.mouseInState=!0,null!==l.selectedState){var a=t.getStateById(d3.select(this).attr("object-id")),n={};n.fromState=l.selectedState.id,n.toState=a.id;var i=l.tmpTransitionline;if(l.existsDrawnTransition(l.selectedState.fromState,l.selectedState.toState)){var r=l.getDrawnTransition(n.fromState,n.toState);r.names.push(n.name),l.writeTransitionText(r.objReference.select(".transition-text"),r.names)}else if(n.fromState!=n.toState){var s=l.getTransitionDrawConfig(n);if(s.approachTransition){var o=l.getDrawnTransition(n.toState,n.fromState),c=l.getTransitionDrawConfig(o,!0);l.updateTransitionLines(o.objReference,c.path),o.objReference.select(".transition-text").attr("x",c.xText).attr("y",c.yText),l.otherTransition=o}i.attr("d",s.path)}else{var d=t.getArrayStateIdByStateId(n.fromState),u=t.config.states[d].x,f=t.config.states[d].y;i.attr("d",l.selfTransition(u,f))}l.tmpTransitionline.attr("x1",l.selectedState.x).attr("y1",l.selectedState.y).attr("x2",a.x).attr("y2",a.y)}}).on("mouseleave",function(){if(l.mouseInState=!1,null!==l.otherTransition&&void 0!==l.otherTransition){var t=l.getTransitionDrawConfig(l.otherTransition);l.updateTransitionLines(l.otherTransition.objReference,t.path),l.otherTransition.objReference.select(".transition-text").attr("x",t.xText).attr("y",t.yText)}})},l.renameState=function(e,a){var n=t.config.states[t.getArrayStateIdByStateId(e)],i=n.objReference;i.select("text").text(a)},l.removeState=function(e){l.closeStateMenu();var a=t.config.states[t.getArrayStateIdByStateId(e)],n=a.objReference;n.remove()},l.renameTransition=function(t,e,a,n){var i=l.getDrawnTransition(t,e),r=_.find(i.names,{id:a});r.name=n,l.writeTransitionText(i.objReference.select(".transition-text"),i.names)},l.removeTransition=function(e){var a=t.getTransitionById(e),n=l.getDrawnTransition(a.fromState,a.toState),i=l.getTransitionDrawConfig(a);if(l.closeTransitionMenu(),1===n.names.length){if(n.objReference.remove(),_.remove(t.config.drawnTransitions,function(t){return t==n}),i.approachTransition){var r=l.getDrawnTransition(a.toState,a.fromState),s=l.getTransitionDrawConfig(r,!1);l.updateTransitionLines(r.objReference,s.path),r.objReference.select(".transition-text").attr("x",s.xText).attr("y",s.yText),l.otherTransition=r}}else _.remove(n.names,function(t){return t.id==a.id}),l.writeTransitionText(n.objReference.select(".transition-text"),n.names),i=l.getTransitionDrawConfig(a),n.objReference.select(".transition-text").attr("x",i.xText).attr("y",i.yText),console.log(n),l.openTransitionMenu(n.names[n.names.length-1].id)},l.addFinalState=function(e){var a=t.getStateById(e);a.objReference.insert("circle",".state-circle").attr("class","final-state").attr("r",l.settings.finalStateRadius)},l.removeFinalState=function(e){var a=t.getStateById(e);a.objReference.select(".final-state").remove()},l.changeStartState=function(e){if(null!==t.config.startState){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove()}var n=t.getStateById(e);n.objReference.append("line").attr("class","transition-line start-line").attr("x1",0).attr("y1",-75).attr("x2",0).attr("y2",0-l.settings.stateRadius-4).attr("marker-end","url(#marker-end-arrow)")},l.removeStartState=function(e){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove(),t.config.startState=null,t.updateListener()},l.drawState=function(e){var a=t.getStateById(e),n=l.svgStates.append("g").attr("transform","translate("+a.x+" "+a.y+")").attr("class","state state-"+a.id).attr("object-id",a.id);n.append("circle").attr("class","state-circle").attr("r",l.settings.stateRadius),n.append("circle").attr("class","state-circle hover-circle").attr("r",l.settings.stateRadius),n.append("text").text(a.name).attr("class","state-text").attr("dominant-baseline","central").attr("text-anchor","middle");return a.objReference=n,n.on("click",l.openStateMenu).call(l.dragState),n},l.setStateClassAs=function(e,a,n){var i=t.getStateById(e).objReference;i.classed(n,a)},l.setTransitionClassAs=function(e,a,n){var i=t.getTransitionById(e),r=l.getDrawnTransition(i.fromState,i.toState).objReference;r.classed(n,a),a&&"animated-transition"==n?r.select(".transition-line").attr("marker-end","url(#marker-end-arrow-animated)"):r.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.setArrowMarkerTo=function(t,e){""!==e?t.select(".transition-line").attr("marker-end","url(#marker-end-arrow-"+e+")"):t.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.openStateMenu=function(){console.log("open state menu"),l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply(),l.preventSvgOuterClick=!0,l.showStateMenu=!0,l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.input={},l.input.state=l.selectedState,l.input.stateName=l.selectedState.name,l.input.startState=t.config.startState==l.selectedState.id,l.input.finalState=t.isStateAFinalState(l.selectedState.id),l.input.ttt="",l.input.tttisopen=!1,t.safeApply(),l.stateMenuListener=[],l.stateMenuListener.push(t.$watch("statediagram.input.startState",function(e,a){e!==a&&(l.input.startState?t.changeStartState(l.input.state.id):l.selectedState.id==t.config.startState&&t.removeStartState())})),l.stateMenuListener.push(t.$watch("statediagram.input.finalState",function(e,a){e!==a&&(l.input.finalState?t.addFinalState(l.input.state.id):t.removeFinalState(l.input.state.id))})),l.stateMenuListener.push(t.$watch("statediagram.input.stateName",function(e,a){if(l.input.tttisopen=!1,e!==a)if(""===e||t.existsStateWithName(e))""===e?(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_TOO_SHORT"):t.existsStateWithName(e,l.input.state.id)&&(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_ALREADY_EXIST");else{!t.renameState(l.input.state.id,e)}}))},l.closeStateMenu=function(){_.forEach(l.stateMenuListener,function(t,e){t()}),null!==l.selectedState&&l.toggleState(l.selectedState.id,!1),l.stateMenuListener=null,l.showStateMenu=!1,l.input=null},l.toggleState=function(t,e){l.setStateClassAs(t,e,"active"),e===!1&&(l.selectedState=null)},l.dragState=d3.behavior.drag().on("dragstart",function(){l.dragAmount=0,d3.event.sourceEvent.stopPropagation()}).on("drag",function(){if(1==d3.event.sourceEvent.which&&!l.preventStateDragging){l.dragAmount++;var e=d3.event.x,a=d3.event.y;if(l.snapping){var n=e-e%l.gridSpace,i=a-a%l.gridSpace;e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n,a=i):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n+l.gridSpace,a=i):e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance?(e=n,a=i+l.gridSpace):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance&&(e=n+l.gridSpace,a=i+l.gridSpace)}if(l.dragAmount>1){d3.select(this).attr("transform","translate("+e+" "+a+")");var r=d3.select(this).attr("object-id"),s=t.getStateById(r);s.x=e,s.y=a,l.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"))}}}).on("dragend",function(){l.dragAmount>1&&t.safeApply()}),l.selfTransition=function(t,e){return l.bezierLine([[t-l.stateSelfReferenceNumber,e-l.stateSelfReferenceNumber],[t-l.stateSelfReferenceNumber-u,e-l.stateSelfReferenceNumber-f],[t-l.stateSelfReferenceNumber-u,e+l.stateSelfReferenceNumber+f],[t-l.stateSelfReferenceNumber,e+l.stateSelfReferenceNumber]])};var g=30;l.bezierLine=d3.svg.line().x(function(t){return t[0]}).y(function(t){return t[1]}).interpolate("basis"),l.getTransitionDrawConfig=function(e,n){var c=3,u={};u.approachTransition=n||l.existsDrawnTransition(e.toState,e.fromState);var f,m=t.getStateById(e.fromState),g=t.getStateById(e.toState),S=t.isStateAFinalState(e.toState),p=m.x,v=m.y,h=g.x,T=g.y,x={x:h-p,y:T-v},y=Math.sqrt(x.x*x.x+x.y*x.y),A=l.settings.stateRadius/y;f=S?(l.settings.stateRadius+c+5)/y:(l.settings.stateRadius+c)/y,u.xStart=p+A*x.x,u.yStart=v+A*x.y,u.xEnd=h-f*x.x,u.yEnd=T-f*x.y,u.xDiff=h-p,u.yDiff=T-v,u.xMid=(p+h)/2,u.yMid=(v+T)/2,u.distance=Math.sqrt(u.xDiff*u.xDiff+u.yDiff*u.yDiff);var w,I,M={x:u.xMid-u.xStart,y:u.yMid-u.yStart,z:0},D={x:0,y:0,z:1},b={x:1,y:0,z:0};if(w=20,I=a(M,D),I=s(I),I=r(I,w),u.approachTransition){var C=d({x:u.xStart-p,y:u.yStart-v},{x:l.settings.stateRadius,y:0}),L=d({x:u.xEnd-h,y:u.yEnd-T},{x:l.settings.stateRadius,y:0});u.xStart=p+l.settings.stateRadius*Math.cos(i(C.upperAngle)),u.yStart=v-l.settings.stateRadius*Math.sin(i(C.upperAngle)),u.xEnd=h+l.settings.stateRadius*Math.cos(i(L.lowerAngle)),u.yEnd=T-l.settings.stateRadius*Math.sin(i(L.lowerAngle))}w=35,I=a(M,D),I=s(I),I=r(I,w),u.xMidCurv=I.x+u.xMid,u.yMidCurv=I.y+u.yMid;var k,R=(l.existsDrawnTransition(m.id,g.id),l.getDrawnTransition(m.id,g.id));k=R?R.names.length:1;var E,N,_=o(M,b),B=_.degree;B>90&&(B=90-B%90);var O=Math.pow(B/90,.5);E=u.approachTransition?40+8*k*O:12+8*k*O,N=a(M,D),N=s(N),N=r(N,E),u.xText=N.x+u.xMid,u.yText=N.y+u.yMid;var F=[];return F=u.approachTransition?[[u.xStart,u.yStart],[u.xMidCurv,u.yMidCurv],[u.xEnd,u.yEnd]]:[[u.xStart,u.yStart],[u.xEnd,u.yEnd]],u.path=l.bezierLine(F),u},l.writeTransitionText=function(e,a){e.selectAll("*").remove();for(var n=0;n<a.length;n++)null!==t.simulator.animated.transition&&a[n].id===t.simulator.animated.transition.id?e.append("tspan").attr("transition-id",a[n].id).text(a[n].name).classed("animated-transition-text",!0):e.append("tspan").attr("transition-id",a[n].id).text(a[n].name),n<a.length-1&&e.append("tspan").text(" | ")},l.drawTransition=function(e){var a=t.getTransitionById(e);if(!l.existsDrawnTransition(a.fromState,a.toState)){var n=l.svgTransitions.append("g").attr("class","transition"),i=(n.append("path").attr("class","transition-line-selection").attr("fill","none").attr("marker-end","url(#marker-end-arrow-selection)"),n.append("path").attr("class","transition-line").attr("fill","none").attr("marker-end","url(#marker-end-arrow)"),n.append("path").attr("class","transition-line-click").attr("stroke-width",20).attr("stroke","transparent").attr("fill","none"),n.append("path").attr("class","transition-line-hover").attr("fill","none").attr("marker-end","url(#marker-end-arrow-hover)"),n.append("text").attr("class","transition-text").attr("dominant-baseline","central").attr("fill","black"));if(a.fromState!=a.toState){var r=l.getTransitionDrawConfig(a);if(r.approachTransition){var s=l.getDrawnTransition(a.toState,a.fromState),o=l.getTransitionDrawConfig(s,!0);l.updateTransitionLines(s.objReference,o.path),s.objReference.select(".transition-text").attr("x",o.xText).attr("y",o.yText)}i.attr("class","transition-text").attr("x",r.xText).attr("y",r.yText),l.updateTransitionLines(n,r.path)}else{var c=t.getArrayStateIdByStateId(a.fromState),d=t.config.states[c].x,u=t.config.states[c].y;l.updateTransitionLines(n,l.selfTransition(d,u)),i.attr("x",d-l.settings.stateRadius-50).attr("y",u)}return n.attr("object-id",t.config.drawnTransitions.push({fromState:a.fromState,toState:a.toState,names:[{id:a.id,name:a.name}],objReference:n})-1),l.writeTransitionText(i,l.getDrawnTransition(a.fromState,a.toState).names),n.attr("from-state-id",a.fromState).attr("to-state-id",a.toState).on("click",l.openTransitionMenu).on("mouseover",function(){d3.select(this).select(".transition-line-hover").attr("style","opacity:0.6")}).on("mouseleave",function(){d3.select(this).select(".transition-line-hover").attr("style","")}),n}var f=l.getDrawnTransition(a.fromState,a.toState);f.names.push({id:a.id,name:a.name}),l.writeTransitionText(f.objReference.select(".transition-text"),l.getDrawnTransition(a.fromState,a.toState).names);var m=l.getTransitionDrawConfig(a);f.objReference.select(".transition-text").attr("x",m.xText).attr("y",m.yText)},l.updateTransitionLines=function(t,e){t.select(".transition-line").attr("d",e),t.select(".transition-line-selection").attr("d",e),t.select(".transition-line-hover").attr("d",e),t.select(".transition-line-click").attr("d",e)},l.openTransitionMenu=function(e){l.closeStateMenu(),l.closeTransitionMenu(),l.preventSvgOuterClick=!0,l.showTransitionMenu=!0;var a,n;if(void 0===e)a=d3.select(this).attr("from-state-id"),n=d3.select(this).attr("to-state-id"),l.selectedTransition=l.getDrawnTransition(a,n);else{var i=t.getTransitionById(e);a=i.fromState,n=i.toState,l.selectedTransition=l.getDrawnTransition(a,n)}l.selectedTransition.objReference.classed("active",!0),l.input={},l.input.fromState=t.getStateById(a),l.input.toState=t.getStateById(n),l.input.transitions=[],_.forEach(l.selectedTransition.names,function(t,a){var n={};n=cloneObject(t),void 0!==e?t.id==e&&(n.isFocus=!0):l.selectedTransition.names.length-1===a&&(n.isFocus=!0),n.ttt="",n.tttisopen=!1,l.input.transitions.push(n)}),l.transitionMenuListener=[];for(var r=0;r<l.input.transitions.length;r++)l.transitionMenuListener.push(t.$watchCollection("statediagram.input.transitions['"+r+"']",function(e,i){e.name!==i.name&&(e.tttisopen=!1,""===e.name||t.existsTransition(a,n,e.name)?""===e.name?(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_TOO_SHORT"):t.existsTransition(a,n,e.name,e.id)&&(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_ALREAD_EXISTS"):t.renameTransition(e.id,e.name),console.log(t.existsTransition(a,n,e.name,e.id)))}));t.safeApply()},l.closeTransitionMenu=function(){_.forEach(l.transitionMenuListener,function(t,e){t()}),l.showTransitionMenu=!1,null!==l.selectedTransition&&(l.selectedTransition.objReference.classed("active",!1),l.selectedTransition=null)},l.updateTransitionsAfterStateDrag=function(e){t.config.states[t.getArrayStateIdByStateId(e)].name;_.forEach(t.config.drawnTransitions,function(a,n){if(a.fromState==e||a.toState==e){var i=a.objReference,r=i.select("text");if(a.fromState!=a.toState){var s=l.getTransitionDrawConfig(a);l.updateTransitionLines(i,s.path),r.attr("x",s.xText).attr("y",s.yText)}else{var o=a.fromState,c=t.config.states[t.getArrayStateIdByStateId(o)].x,d=t.config.states[t.getArrayStateIdByStateId(o)].y;l.updateTransitionLines(i,l.selfTransition(c,d)),r.attr("x",c-l.settings.stateRadius-50).attr("y",d)}}})},t.$watch("simulator.animated.currentState",function(e,a){e!==a&&(console.log("CURRENTSTATE:oldValue "+a+" newvalue "+e),console.log("status"+t.simulator.status),null!==a&&(l.setStateClassAs(a,!1,"animated-currentstate-svg"),l.setStateClassAs(a,!1,"animated-accepted-svg"),l.setStateClassAs(a,!1,"animated-not-accepted-svg")),null!==e&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"):l.setStateClassAs(e,!0,"animated-currentstate-svg")))}),t.$watch("simulator.animated.transition",function(t,e){t!==e&&(null!==e&&(l.setTransitionClassAs(e.id,!1,"animated-transition"),d3.selectAll("[transition-id='"+e.id+"'").classed("animated-transition-text",!1)),null!==t&&(l.setTransitionClassAs(t.id,!0,"animated-transition"),console.log(t),d3.selectAll("[transition-id='"+t.id+"'").classed("animated-transition-text",!0)))}),t.$watch("simulator.animated.nextState",function(t,e){t!==e&&(console.log("NEXTSTATE: oldValue "+e+" newvalue "+t),null!==e&&l.setStateClassAs(e,!1,"animated-nextstate-svg"),null!==t&&l.setStateClassAs(t,!0,"animated-nextstate-svg"))}),t.$watch("simulator.status",function(e,a){e!==a&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status&&l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"))})}function StatetransitionfunctionDFA(t){"use strict";var e=this;e.functionData={},e.functionData.states=[],e.functionData.startState="",e.functionData.finalStates="",e.functionData.transitions="",e.functionData.statetransitionfunction=[],t.updateListeners.push(e),e.updateFunction=function(){var a,n="",i="",r="",s="";e.functionData.transitions=t.config.alphabet,e.functionData.states=[],_.forEach(t.config.states,function(a,i){n="";var r="";null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id&&(r="selected"),n+=a.id==t.simulator.animated.currentState&&"accepted"===t.simulator.status?'<span class="animated-accepted '+r+'">':a.id==t.simulator.animated.currentState&&"not accepted"===t.simulator.status?'<span class="animated-not-accepted '+r+'">':a.id==t.simulator.animated.currentState?'<span class="animated-currentstate '+r+'">':'<span class="'+r+'">',n+=a.name,n+="</span>",i<t.config.states.length-1&&(n+=", "),e.functionData.states.push(n)}),e.functionData.statetransitionfunction=[],_.forEach(t.config.states,function(a,n){_.forEach(t.config.transitions,function(n,r){if(n.fromState===a.id){var s=n,o=!1;null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{id:n.id})&&(o=!0);var c=!1;t.simulator.animated.transition&&t.simulator.animated.transition.id===s.id&&(c=!0),i=c||o?'(<span class=" '+(c?"animated-transition":"")+" "+(o?"selected":"")+'">':"(<span>",i+=t.getStateById(s.fromState).name+", ",i+=s.name+", ",i+=t.getStateById(s.toState).name+"</span>)",e.functionData.statetransitionfunction.push(i)}})}),a=t.getStateById(t.config.startState),void 0!==a&&(r+='<span class="">'+a.name+"</span>"),e.functionData.startState=r,_.forEach(t.config.finalStates,function(e,a){e=t.getStateById(e),s=e.name,a<t.config.finalStates.length-1&&(s+=", ")}),e.functionData.finalStates=s},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.status",function(t,a){t!==a&&e.updateFunction()})}function TableDFA(t){var e=this;e.states=[],t.updateListeners.push(e),e.updateFunction=function(){e.states=[],e.alphabet=[];t.config;_.forEach(t.config.alphabet,function(a,n){var i="";null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{name:a})&&(i="selected");var r;r=t.simulator.animated.transition&&t.simulator.animated.transition.name===a?'<span class="animated-transition '+i+'">'+a+"</span>":'<span class="'+i+'">'+a+"</span>",e.alphabet.push(r)}),_.forEach(t.config.states,function(a,n){var i={};i.id=a.id;var r="";if((null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id||null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.fromState===a.id)&&(r="selected"),t.simulator.animated.currentState==a.id){var s="";s="accepted"===t.simulator.status?"animated-accepted":"not accepted"===t.simulator.status?"animated-not-accepted":"animated-currentstate",i.name='<span class="'+s+" "+r+'">'+a.name+"</span>"}else i.name='<span class="'+r+'">'+a.name+"</span>";t.isStateAFinalState(a.id)?i.finalState=!0:i.finalState=!1,t.config.startState===a.id?i.startState=!0:i.startState=!1,i.trans=[],_.forEach(t.config.alphabet,function(e,n){var r=null;_.forEach(t.config.transitions,function(t,n){t.fromState===a.id&&t.name===e&&(r=t)});var s={};if(s.alphabet=e,null!==r){var o=t.getStateById(r.toState),c="";null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.toState===o.id&&(c="selected"),t.simulator.animated.nextState==o.id&&r.name==t.simulator.animated.transition.name?s.State='<span class="animated-nextstate '+c+'">'+o.name+"</span>":s.State='<span class="'+c+'">'+o.name+"</span>"}else s.State="";i.trans.push(s)}),e.states.push(i)})},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.nextState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()})}function DFA(t,e){"use strict";window.debugScope=t,t.defaultConfig={},t.defaultConfig.statePrefix="S",t.defaultConfig.transitionNameSuffix="|",t.defaultConfig.diagramm={x:0,y:0,scale:1,updatedWithZoomBehavior:!1},t.defaultConfig.countStateId=0,t.defaultConfig.countTransitionId=0,t.defaultConfig.states=[],t.defaultConfig.startState=null,t.defaultConfig.finalStates=[],t.defaultConfig.transitions=[],t.defaultConfig.alphabet=[],t.defaultConfig.inputWord="",t.defaultConfig.name="Untitled Automaton",t.defaultConfig.unSavedChanges=!1,t.defaultConfig.drawnTransitions=[],t.config=cloneObject(t.defaultConfig),t.updateListeners=[],t.simulator=new SimulationDFA(t),t.table=new TableDFA(t),t.statediagram=new StateDiagramDFA(t,"#diagramm-svg"),t.statetransitionfunction=new StatetransitionfunctionDFA(t),t.testData=new TestData(t),t.inNameEdit=!1,t.showModalWithMessage=function(e,a,n,i){t.title=e,t.description=a,t.modalAction=n,void 0===i?t.button="MODAL_BUTTON.PROCEED":t.button=i,$("#modal").modal()},t.executeModalAction=function(){t.$eval(t.modalAction)},t.stepTimeOutSlider={options:{floor:0,step:100,ceil:3e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.loopTimeOutSlider={options:{floor:0,step:100,ceil:4e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.keypressCallback=function(t){13==t.charCode&&document.getElementById("automatonNameEdit").blur()},window.onbeforeunload=function(e){if(t.config.unSavedChanges){var a="All Changes will be Lost. Save before continue!";return"undefined"==typeof e&&(e=window.event),e&&(e.returnValue=a),a}},t.saveAutomaton=function(){t.config.unSavedChanges=!1},t.safeApply=function(t){var e=this.$root.$$phase;"$apply"==e||"$digest"==e?t&&"function"==typeof t&&t():this.$apply(t)},t.resetAutomaton=function(){t.statediagram.clearSvgContent(),t.simulator.reset(),t.config=cloneObject(t.defaultConfig),t.safeApply(),t.updateListener()},t.addToAlphabet=function(e){_.some(t.config.alphabet,function(t){return t===e})||t.config.alphabet.push(e)},t.removeFromAlphabetIfNotUsedFromOthers=function(e){for(var a=t.getTransitionById(e),n=!1,i=0;i<t.config.transitions.length;i++)if(a.name===t.config.transitions[i].name&&t.config.transitions[i].id!==e)return void(n=!0);return n?!1:(_.pull(t.config.alphabet,a.name),!0)},t.updateListener=function(){_.forEach(t.updateListeners,function(t,e){t.updateFunction()}),t.config.unSavedChanges=!0},t.existsStateWithName=function(e,a){var n=!1;return _.forEach(t.config.states,function(t){return t.name==e&&t.id!==a?void(n=!0):void 0}),n},t.existsStateWithId=function(e){for(var a=0;a<t.config.states.length;a++)if(t.config.states[a].id==e)return!0;return!1},t.hasStateTransitions=function(e){var a=!1;return _.forEach(t.config.transitions,function(t){t.fromState!=e&&t.toState!=e||(a=!0)}),a},t.getArrayStateIdByStateId=function(e){return _.findIndex(t.config.states,function(t){return t.id==e?t:void 0})},t.getStateById=function(e){return t.config.states[t.getArrayStateIdByStateId(e)]},t.getStateByName=function(e){return t.config.states[t.getArrayStateIdByStateId(function(t){})]},t.addStateWithPresets=function(e,a){var n=t.addState(t.config.statePrefix+t.config.countStateId,e,a);return 1==t.config.countStateId&&t.changeStartState(0),n},t.addState=function(e,a,n){return t.existsStateWithName(e)?null:t.addStateWithId(t.config.countStateId++,e,a,n)},t.addStateWithId=function(e,a,n,i){return t.config.states.push(new State(e,a,n,i)),t.statediagram.drawState(e),t.updateListener(),t.safeApply(),t.getStateById(e)},t.removeState=function(e){t.hasStateTransitions(e)?t.showModalWithMessage("STATE_MENU.DELETE_MODAL_TITLE","STATE_MENU.DELETE_MODAL_DESC","forcedRemoveState("+e+")","MODAL_BUTTON.DELETE"):(t.isStateAFinalState(e)&&t.removeFinalState(e),t.config.startState==e&&(t.config.startState=null),t.statediagram.removeState(e),t.config.states.splice(t.getArrayStateIdByStateId(e),1),t.updateListener())},t.forcedRemoveState=function(e){for(var a=0;a<t.config.transitions.length;a++){var n=t.config.transitions[a];n.fromState!==e&&n.toState!==e||(t.removeTransition(n.id),a--)}t.removeState(e)},t.renameState=function(e,a){return t.existsStateWithName(a)?!1:(t.getStateById(e).name=a,t.statediagram.renameState(e,a),t.updateListener(),!0)},t.changeStartState=function(e){t.existsStateWithId(e)&&(t.statediagram.changeStartState(e),t.config.startState=e,t.updateListener())},t.removeStartState=function(){null!==t.config.startState&&(t.statediagram.removeStartState(),t.updateListener(),t.config.startState=null)},t.getFinalStateIndexByStateId=function(e){return _.indexOf(t.config.finalStates,e)},t.isStateAFinalState=function(e){for(var a=0;a<t.config.finalStates.length;a++)if(t.config.finalStates[a]==e)return!0;return!1},t.addFinalState=function(e){t.isStateAFinalState(e)||(t.config.finalStates.push(e),t.statediagram.addFinalState(e),t.updateListener())},t.removeFinalState=function(e){t.isStateAFinalState(e)&&(t.statediagram.removeFinalState(e),t.updateListener(),t.config.finalStates.splice(t.getFinalStateIndexByStateId(e),1))},t.existsTransition=function(e,a,n,i){for(var r=!1,s=0;s<t.config.transitions.length;s++){var o=t.config.transitions[s];o.fromState==e&&o.name==n&&o.id!==i&&(r=!0)}return r},t.getNextTransitionName=function(e){for(var a=[],n=0;n<t.config.transitions.length;n++)t.config.transitions[n].fromState==e&&a.push(t.config.transitions[n].name);for(var i=!1,r="a";!i;){var s=_.indexOf(a,r);-1===s?i=!0:r=String.fromCharCode(r.charCodeAt()+1)}return r},t.addTransition=function(e,a,n){return!t.existsTransition(e,a,n)&&t.existsStateWithId(e)&&t.existsStateWithId(a)?(t.addToAlphabet(n),t.addTransitionWithId(t.config.countTransitionId++,e,a,n)):void 0},t.addTransitionWithId=function(e,a,n,i){return t.config.transitions.push(new TransitionDFA(e,a,n,i)),t.statediagram.drawTransition(e),t.updateListener(),t.safeApply(),t.getTransitionById(e)},t.getArrayTransitionIdByTransitionId=function(e){return _.findIndex(t.config.transitions,function(t){return t.id==e?t:void 0})},t.getTransitionById=function(e){return t.config.transitions[t.getArrayTransitionIdByTransitionId(e)]},t.getTransition=function(e,a,n){for(var i=0;i<t.config.transitions.length;i++){var r=t.config.transitions[i];if(r.fromState==e&&r.toState==a&&r.name==n)return r}},t.removeTransition=function(e){t.removeFromAlphabetIfNotUsedFromOthers(e),t.statediagram.removeTransition(e),t.config.transitions.splice(t.getArrayTransitionIdByTransitionId(e),1),t.updateListener()},t.renameTransition=function(e,a){var n=t.getTransitionById(e);return t.existsTransition(n.fromState,n.toState,a)?!1:(t.getTransitionById(e),t.removeFromAlphabetIfNotUsedFromOthers(e),t.addToAlphabet(a),t.getTransitionById(e).name=a,t.statediagram.renameTransition(n.fromState,n.toState,e,a),t.updateListener(),!0)}}function SimulationDFA(t){"use strict";var e=this;e.isInPlay=!1,e.loopSimulation=!0,e.stepTimeOut=1500,e.loopTimeOut=2e3,e.simulationPaused=!1,e.simulationSettings=!0,e.currentState=null,e.nextState=null,e.transition=null,e.isInputAccepted=!1,e.settings=function(){e.simulationSettings=!e.simulationSettings},e.animated={currentState:null,transition:null,nextState:null},e.reset=function(){e.animated={currentState:null,transition:null,nextState:null},e.goneTransitions=[],e.currentState=t.config.startState,e.transition=null,e.animatedTransition=!1,e.nextState=null,e.animatedNextState=!1,e.isNextStepCalculated=!1,e.simulationStarted=!1,e.statusSequence=[t.config.startState],e.madeSteps=0,e.inputWord=t.config.inputWord,e.processedWord="",e.nextChar="",e.status="stopped"},e.pause=function(){e.simulationPaused||(e.simulationPaused=!0,e.isInPlay=!1)},e.stop=function(){e.pause(),e.reset()},e.play=function(){e.simulationPaused||(e.simulationStarted?((e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&(e.animateNextMove(),t.safeApply(function(){}),(e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&setTimeout(e.play,e.stepTimeOut)),e.isNextStepCalculated||"accepted"!=e.status||(e.loopSimulation?setTimeout(e.play,e.loopTimeOut):e.isInPlay=!1,e.simulationStarted=!1,t.safeApply(function(){}))):e.prepareSimulation())},e.prepareSimulation=function(){e.reset(),e.simulationStarted=!0,e.animated.currentState=_.last(e.statusSequence),t.safeApply(),setTimeout(e.play,e.loopTimeOut)},e.animateNextMove=function(){e.isNextStepCalculated||e.calcNextStep(),e.animatedTransition?!e.animatedNextState&&e.animatedTransition?(e.animatedNextState=!0,e.animated.nextState=e.nextState):e.animatedTransition&&e.animatedNextState&&(e.animated.transition=null,e.animated.nextState=null,e.animated.currentState=e.nextState,e.currentState=e.nextState,e.madeSteps++,e.inputWord.length==e.madeSteps&&(_.include(t.config.finalStates,e.currentState)?e.status="accepted":e.status="not accepted"),e.isNextStepCalculated=!1,e.animatedNextState=!1,e.animatedTransition=!1,e.processedWord+=e.nextChar,e.statusSequence.push(e.currentState),"accepted"!==e.status&&"not accepted"!==e.status&&e.calcNextStep()):(e.animatedTransition=!0,e.animated.transition=e.transition,e.goneTransitions.push(e.transition))},e.calcNextStep=function(){return e.isNextStepCalculated=!0,e.status="step",e.nextChar=e.inputWord[e.madeSteps],e.transition=_.filter(t.config.transitions,function(t){return void 0===e.nextChar?void(e.status="not accepted"):t.fromState==_.last(e.statusSequence)&&t.name==e.nextChar}),_.isEmpty(e.transition)?(e.transition=null,void(e.status="not accepted")):(e.transition=e.transition[0],void(e.nextState=e.transition.toState))},e.stepForward=function(){if(e.simulationPaused||e.pause(),e.simulationStarted){
if(!_.include(["step","stopped","accepted","not accepted"],e.status))return void console.log(e.status);_.include(["accepted","not accepted"],e.status)||e.animateNextMove()}else e.prepareSimulation(),e.status="step"},e.stepBackward=function(){e.simulationPaused||e.pause(),_.include(["step","accepted","not accepted"],e.status)&&(e.status="step",e.animatedTransition||e.animatedNextState||0!==e.madeSteps?e.animateLastMove():e.reset())},e.animateLastMove=function(){console.log(e.animatedTransition+" "+e.animatedNextState),e.animatedTransition&&e.animatedNextState?(e.animated.nextState=null,e.animatedNextState=!1):e.animatedTransition?(e.animated.transition=null,e.animatedTransition=!1,e.goneTransitions.pop()):e.calcLastStep()},e.calcLastStep=function(){e.nextChar=e.processedWord.slice(-1),console.log(e.nextChar+" "+e.statusSequence[e.statusSequence.length-2]),e.transition=_.last(e.goneTransitions),console.log(e.transition),_.pullAt(e.goneTransitions,e.goneTransitions.length),e.animatedTransition=!0,e.animated.transition=e.transition;var t=e.currentState;e.currentState=e.transition.fromState,e.nextState=t,e.animated.nextState=e.nextState,e.animatedNextState=!0,e.animated.currentState=e.currentState,e.madeSteps--,e.statusSequence.splice(-1,1),e.processedWord=e.processedWord.slice(0,-1)},e.getNextTransition=function(e,a){for(var n=0;n<t.config.transitions.length;n++){var i=t.config.transitions[n];if(i.fromState==e&&i.name==a)return i}},e.check=function(){var a=!1,n=[];n.push(t.config.startState);for(var i="",r=0,s=null;r<=t.config.inputWord.length&&(i=t.config.inputWord[r],s=e.getNextTransition(_.last(n),i),!_.isEmpty(s));)if(n.push(s.toState),r++,t.config.inputWord.length==r){if(_.include(t.config.finalStates,_.last(n))){a=!0;break}break}return a},e.isPlayable=function(){return t.config.states.length>=1&&t.config.transitions.length>=1&&null!==t.config.startState&&t.config.finalStates.length>=1},e.playOrPause=function(){e.isPlayable()&&(e.isInPlay=!e.isInPlay,e.isInPlay?(e.simulationPaused=!1,e.play()):e.pause())},t.updateListeners.push(e),e.updateFunction=function(){e.isInputAccepted=e.check()}}function StateDiagramDFA(t,e){"use strict";function a(t,e){var a={x:t.y*e.z,y:-t.x*e.z};return a}function n(t){return t*(180/Math.PI)}function i(t){return t*(Math.PI/180)}function r(t,e){return{x:t.x*e,y:t.y*e}}function s(t){var e=1/Math.sqrt(t.x*t.x+t.y*t.y);return{x:t.x*e,y:t.y*e}}function o(t,e){var a=(t.x*e.x+t.y*e.y)/(Math.sqrt(t.x*t.x+t.y*t.y)*Math.sqrt(e.x*e.x+e.y*e.y)),i=Math.acos(a);return{val:a,rad:i,degree:n(i)}}function c(t,e){var a=t.x*e.x+t.y*e.y,n=t.x*e.y-t.y*e.x;return Math.atan2(n,a)}function d(t,e){var a=n(c(t,e));0>a&&(a+=360);var i=a+g;i>360&&(i-=360);var r=a-g;return 0>r&&(r+=360),{angle:a,lowerAngle:r,upperAngle:i}}var l=this;l.preventStateDragging=!1,l.inAddTransition=!1,l.selectedState=null,l.preventSvgOuterClick=!1,l.selectedTransition=null,l.showStateMenu=!1,l.showTransitionMenu=!1,l.selectedStateName="selectedForTransition",l.snapping=!0,l.settings={stateRadius:25,finalStateRadius:29,selected:!1};var u=40,f=18;l.stateSelfReferenceNumber=Math.sin(45*(Math.PI/180))*l.settings.stateRadius,l.existsDrawnTransition=function(e,a){for(var n=!1,i=0;i<t.config.drawnTransitions.length;i++){var r=t.config.drawnTransitions[i];r.fromState==e&&r.toState==a&&(n=!0)}return n},l.getDrawnTransition=function(e,a){for(var n=0;n<t.config.drawnTransitions.length;n++){var i=t.config.drawnTransitions[n];if(i.fromState==e&&i.toState==a)return i}},l.clearSvgContent=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgTransitions.html(""),l.svgStates.html(""),t.config.drawnTransitions=[],l.svg.attr("transform","translate("+t.defaultConfig.diagramm.x+","+t.defaultConfig.diagramm.y+") scale("+t.defaultConfig.diagramm.scale+")"),m.scale(t.defaultConfig.diagramm.scale),m.translate([t.defaultConfig.diagramm.x,t.defaultConfig.diagramm.y])},l.zoomMax=2.5,l.zoomMin=.5,l.zoomValue=.1,l.zoomIn=function(){t.config.diagramm.scale=t.config.diagramm.scale+l.zoomValue>l.zoomMax?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale+l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomOut=function(){t.config.diagramm.scale=t.config.diagramm.scale-l.zoomValue<=l.zoomMin?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale-l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomTo=function(e){console.log("zoomtedto"),t.config.diagramm.scale=e/100,t.safeApply(),l.updateZoomBehaviour()},l.updateZoomBehaviour=function(){t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")"),m.scale(t.config.diagramm.scale),m.translate([t.config.diagramm.x,t.config.diagramm.y])},l.zoomFitWindow=function(){var e,a=[],n=[],i=0,r=0,s=0,o=0,c=0,d=0,u=l.svgOuter.style("width").replace("px",""),f=l.svgOuter.style("height").replace("px","");if(t.config.diagramm.scale=1,t.config.states.length>0){for(e=0;e<t.config.states.length;e++)a[e]=t.config.states[e].x;for(e=0;e<t.config.states.length;e++)n[e]=t.config.states[e].y;for(i=_.min(a),r=_.max(a),s=_.min(n),o=_.max(n);r-i+150>u/t.config.diagramm.scale||o-s+200>f/t.config.diagramm.scale;)t.config.diagramm.scale-=.01;t.safeApply(),c=(f/t.config.diagramm.scale-(o-s))/2,d=(u/t.config.diagramm.scale-(r-i))/2,t.config.diagramm.x=-(i*t.config.diagramm.scale)+d*t.config.diagramm.scale,t.config.diagramm.y=-(s*t.config.diagramm.scale)+c*t.config.diagramm.scale,l.updateZoomBehaviour()}else l.scaleAndTranslateToDefault()},l.scaleAndTranslateToDefault=function(){t.config.diagramm.scale=t.defaultConfig.diagramm.scale,t.config.diagramm.x=t.defaultConfig.diagramm.x,t.config.diagramm.y=t.defaultConfig.diagramm.y,t.safeApply(),l.updateZoomBehaviour()};var m=d3.behavior.zoom().scaleExtent([l.zoomMin,l.zoomMax]).on("zoom",function(){var e=d3.event.button||d3.event.ctrlKey;if(e&&d3.event.stopImmediatePropagation(),3!==d3.event.sourceEvent.which){var a=Math.floor(100*d3.event.scale)/100;t.config.diagramm.scale=a,t.config.diagramm.x=d3.event.translate[0],t.config.diagramm.y=d3.event.translate[1],t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")")}else console.log("rightclick!")});l.svgOuter=d3.select(e).call(m).on("dblclick.zoom",null).on("contextmenu",function(){d3.event.preventDefault()}),l.addSvgOuterClickListener=function(){l.svgOuter.on("click",function(){l.preventSvgOuterClick?l.preventSvgOuterClick=!1:(l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply())})},l.addSvgOuterClickListener(),l.svgGrid=l.svgOuter.append("g").attr("id","grid"),l.svg=l.svgOuter.append("g").attr("id","svg-items"),l.svgTransitions=l.svg.append("g").attr("id","transitions"),l.svgStates=l.svg.append("g").attr("id","states"),l.gridSpace=100,l.gridSnapDistance=20,l.isGrid=!0,t.$watch("[statediagram.isGrid , config.diagramm]",function(){l.drawGrid()},!0),l.drawGrid=function(){if(l.isGrid){l.svgGrid.html("");var e,a=l.svgOuter.style("width").replace("px",""),n=l.svgOuter.style("height").replace("px",""),i=1*t.config.diagramm.scale*.5,r=t.config.diagramm.x%(l.gridSpace*t.config.diagramm.scale),s=t.config.diagramm.y%(l.gridSpace*t.config.diagramm.scale);for(e=r;a>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line xgrid-line").attr("x1",e).attr("y1",0).attr("x2",e).attr("y2",n);for(e=s;n>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line ygrid-line").attr("x1",0).attr("y1",e).attr("x2",a).attr("y2",e)}else l.svgGrid.html("")},l.defs=l.svg.append("svg:defs"),l.defs.append("svg:marker").attr("id","marker-end-arrow").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-create").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-animated").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-hover").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-selection").attr("refX",4).attr("refY",3).attr("markerWidth",5).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.resetAddActions=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgOuter.on("click",null),l.inAddTransition=!1,l.inAddState=!1},l.addState=function(){l.resetAddActions(),l.svgOuter.on("mousemove",function(){l.selectedState.objReference.attr("transform","translate("+(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale)+" "+(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale)+")")}),l.selectedState=t.addStateWithPresets(-1e4,-1e4),l.selectedState.objReference.classed("state-in-creation",!0),l.svgOuter.on("click",function(){l.selectedState.objReference.classed("state-in-creation",!1),l.selectedState.x=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),l.selectedState.y=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),l.selectedState.objReference.attr("transform","translate("+l.selectedState.x+" "+l.selectedState.y+")"),l.svgOuter.on("mousemove",null),l.addSvgOuterClickListener(),l.preventSvgOuterClick=!1,t.safeApply()})},l.addTransition=function(){l.resetAddActions(),l.preventStateDragging=!0,d3.selectAll(".state").on("click",function(){if(l.mouseInState=!0,null===l.selectedState)l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.tmpTransition=l.svgTransitions.append("g").attr("class","transition"),l.tmpTransitionline=l.tmpTransition.append("path").attr("class","transition-line curvedLine in-creation").attr("marker-end","url(#marker-end-arrow-create)").attr("fill","none");else{var e=t.addTransition(l.selectedState.id,parseInt(d3.select(this).attr("object-id")),t.getNextTransitionName(l.selectedState.id));l.toggleState(l.selectedState.id,!1),l.tmpTransition.remove(),l.tmpTransition=null,l.tmpTransitionline=null,l.preventStateDragging=!1,l.addSvgOuterClickListener(),l.svgOuter.on("mousemove",null),d3.selectAll(".state").on("mouseover",null),d3.selectAll(".state").on("mouseleave",null),d3.selectAll(".state").on("click",l.openStateMenu),l.openTransitionMenu(e.id)}}),l.svgOuter.on("mousemove",function(){if(!l.mouseInState&&null!==l.selectedState){var e=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),a=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),n=l.bezierLine([[l.selectedState.x,l.selectedState.y],[e,a]]);l.tmpTransitionline.attr("d",n)}}),d3.selectAll(".state").on("mouseover",function(e){if(l.mouseInState=!0,null!==l.selectedState){var a=t.getStateById(d3.select(this).attr("object-id")),n={};n.fromState=l.selectedState.id,n.toState=a.id;var i=l.tmpTransitionline;if(l.existsDrawnTransition(l.selectedState.fromState,l.selectedState.toState)){var r=l.getDrawnTransition(n.fromState,n.toState);r.names.push(n.name),l.writeTransitionText(r.objReference.select(".transition-text"),r.names)}else if(n.fromState!=n.toState){var s=l.getTransitionDrawConfig(n);if(s.approachTransition){var o=l.getDrawnTransition(n.toState,n.fromState),c=l.getTransitionDrawConfig(o,!0);l.updateTransitionLines(o.objReference,c.path),o.objReference.select(".transition-text").attr("x",c.xText).attr("y",c.yText),l.otherTransition=o}i.attr("d",s.path)}else{var d=t.getArrayStateIdByStateId(n.fromState),u=t.config.states[d].x,f=t.config.states[d].y;i.attr("d",l.selfTransition(u,f))}l.tmpTransitionline.attr("x1",l.selectedState.x).attr("y1",l.selectedState.y).attr("x2",a.x).attr("y2",a.y)}}).on("mouseleave",function(){if(l.mouseInState=!1,null!==l.otherTransition&&void 0!==l.otherTransition){var t=l.getTransitionDrawConfig(l.otherTransition);l.updateTransitionLines(l.otherTransition.objReference,t.path),l.otherTransition.objReference.select(".transition-text").attr("x",t.xText).attr("y",t.yText)}})},l.renameState=function(e,a){var n=t.config.states[t.getArrayStateIdByStateId(e)],i=n.objReference;i.select("text").text(a)},l.removeState=function(e){l.closeStateMenu();var a=t.config.states[t.getArrayStateIdByStateId(e)],n=a.objReference;n.remove()},l.renameTransition=function(t,e,a,n){var i=l.getDrawnTransition(t,e),r=_.find(i.names,{id:a});r.name=n,l.writeTransitionText(i.objReference.select(".transition-text"),i.names)},l.removeTransition=function(e){var a=t.getTransitionById(e),n=l.getDrawnTransition(a.fromState,a.toState),i=l.getTransitionDrawConfig(a);if(l.closeTransitionMenu(),1===n.names.length){if(n.objReference.remove(),_.remove(t.config.drawnTransitions,function(t){return t==n}),i.approachTransition){var r=l.getDrawnTransition(a.toState,a.fromState),s=l.getTransitionDrawConfig(r,!1);l.updateTransitionLines(r.objReference,s.path),r.objReference.select(".transition-text").attr("x",s.xText).attr("y",s.yText),l.otherTransition=r}}else _.remove(n.names,function(t){return t.id==a.id}),l.writeTransitionText(n.objReference.select(".transition-text"),n.names),i=l.getTransitionDrawConfig(a),n.objReference.select(".transition-text").attr("x",i.xText).attr("y",i.yText),console.log(n),l.openTransitionMenu(n.names[n.names.length-1].id)},l.addFinalState=function(e){var a=t.getStateById(e);a.objReference.insert("circle",".state-circle").attr("class","final-state").attr("r",l.settings.finalStateRadius)},l.removeFinalState=function(e){var a=t.getStateById(e);a.objReference.select(".final-state").remove()},l.changeStartState=function(e){if(null!==t.config.startState){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove()}var n=t.getStateById(e);n.objReference.append("line").attr("class","transition-line start-line").attr("x1",0).attr("y1",-75).attr("x2",0).attr("y2",0-l.settings.stateRadius-4).attr("marker-end","url(#marker-end-arrow)")},l.removeStartState=function(e){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove(),t.config.startState=null,t.updateListener()},l.drawState=function(e){var a=t.getStateById(e),n=l.svgStates.append("g").attr("transform","translate("+a.x+" "+a.y+")").attr("class","state state-"+a.id).attr("object-id",a.id);return n.append("circle").attr("class","state-circle").attr("r",l.settings.stateRadius),n.append("circle").attr("class","state-circle hover-circle").attr("r",l.settings.stateRadius),n.append("text").text(a.name).attr("class","state-text").attr("dominant-baseline","central").attr("text-anchor","middle"),a.objReference=n,n.on("click",l.openStateMenu).call(l.dragState),n},l.setStateClassAs=function(e,a,n){var i=t.getStateById(e).objReference;i.classed(n,a)},l.setTransitionClassAs=function(e,a,n){var i=t.getTransitionById(e),r=l.getDrawnTransition(i.fromState,i.toState).objReference;r.classed(n,a),a&&"animated-transition"==n?r.select(".transition-line").attr("marker-end","url(#marker-end-arrow-animated)"):r.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.setArrowMarkerTo=function(t,e){""!==e?t.select(".transition-line").attr("marker-end","url(#marker-end-arrow-"+e+")"):t.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.openStateMenu=function(){console.log("open state menu"),l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply(),l.preventSvgOuterClick=!0,l.showStateMenu=!0,l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.input={},l.input.state=l.selectedState,l.input.stateName=l.selectedState.name,l.input.startState=t.config.startState==l.selectedState.id,l.input.finalState=t.isStateAFinalState(l.selectedState.id),l.input.ttt="",l.input.tttisopen=!1,t.safeApply(),l.stateMenuListener=[],l.stateMenuListener.push(t.$watch("statediagram.input.startState",function(e,a){e!==a&&(l.input.startState?t.changeStartState(l.input.state.id):l.selectedState.id==t.config.startState&&t.removeStartState())})),l.stateMenuListener.push(t.$watch("statediagram.input.finalState",function(e,a){e!==a&&(l.input.finalState?t.addFinalState(l.input.state.id):t.removeFinalState(l.input.state.id))})),l.stateMenuListener.push(t.$watch("statediagram.input.stateName",function(e,a){l.input.tttisopen=!1,e!==a&&(""===e||t.existsStateWithName(e)?""===e?(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_TOO_SHORT"):t.existsStateWithName(e,l.input.state.id)&&(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_ALREADY_EXIST"):!t.renameState(l.input.state.id,e))}))},l.closeStateMenu=function(){_.forEach(l.stateMenuListener,function(t,e){t()}),null!==l.selectedState&&l.toggleState(l.selectedState.id,!1),l.stateMenuListener=null,l.showStateMenu=!1,l.input=null},l.toggleState=function(t,e){l.setStateClassAs(t,e,"active"),e===!1&&(l.selectedState=null)},l.dragState=d3.behavior.drag().on("dragstart",function(){l.dragAmount=0,d3.event.sourceEvent.stopPropagation()}).on("drag",function(){if(1==d3.event.sourceEvent.which&&!l.preventStateDragging){l.dragAmount++;var e=d3.event.x,a=d3.event.y;if(l.snapping){var n=e-e%l.gridSpace,i=a-a%l.gridSpace;e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n,a=i):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n+l.gridSpace,a=i):e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance?(e=n,a=i+l.gridSpace):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance&&(e=n+l.gridSpace,a=i+l.gridSpace)}if(l.dragAmount>1){d3.select(this).attr("transform","translate("+e+" "+a+")");var r=d3.select(this).attr("object-id"),s=t.getStateById(r);s.x=e,s.y=a,l.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"))}}}).on("dragend",function(){l.dragAmount>1&&t.safeApply()}),l.selfTransition=function(t,e){return l.bezierLine([[t-l.stateSelfReferenceNumber,e-l.stateSelfReferenceNumber],[t-l.stateSelfReferenceNumber-u,e-l.stateSelfReferenceNumber-f],[t-l.stateSelfReferenceNumber-u,e+l.stateSelfReferenceNumber+f],[t-l.stateSelfReferenceNumber,e+l.stateSelfReferenceNumber]])};var g=30;l.bezierLine=d3.svg.line().x(function(t){return t[0]}).y(function(t){return t[1]}).interpolate("basis"),l.getTransitionDrawConfig=function(e,n){var c=3,u={};u.approachTransition=n||l.existsDrawnTransition(e.toState,e.fromState);var f,m=t.getStateById(e.fromState),g=t.getStateById(e.toState),S=t.isStateAFinalState(e.toState),p=m.x,v=m.y,h=g.x,T=g.y,x={x:h-p,y:T-v},y=Math.sqrt(x.x*x.x+x.y*x.y),A=l.settings.stateRadius/y;f=S?(l.settings.stateRadius+c+5)/y:(l.settings.stateRadius+c)/y,u.xStart=p+A*x.x,u.yStart=v+A*x.y,u.xEnd=h-f*x.x,u.yEnd=T-f*x.y,u.xDiff=h-p,u.yDiff=T-v,u.xMid=(p+h)/2,u.yMid=(v+T)/2,u.distance=Math.sqrt(u.xDiff*u.xDiff+u.yDiff*u.yDiff);var w,I,M={x:u.xMid-u.xStart,y:u.yMid-u.yStart,z:0},D={x:0,y:0,z:1},b={x:1,y:0,z:0};if(w=20,I=a(M,D),I=s(I),I=r(I,w),u.approachTransition){var C=d({x:u.xStart-p,y:u.yStart-v},{x:l.settings.stateRadius,y:0}),L=d({x:u.xEnd-h,y:u.yEnd-T},{x:l.settings.stateRadius,y:0});u.xStart=p+l.settings.stateRadius*Math.cos(i(C.upperAngle)),u.yStart=v-l.settings.stateRadius*Math.sin(i(C.upperAngle)),u.xEnd=h+l.settings.stateRadius*Math.cos(i(L.lowerAngle)),u.yEnd=T-l.settings.stateRadius*Math.sin(i(L.lowerAngle))}w=35,I=a(M,D),I=s(I),I=r(I,w),u.xMidCurv=I.x+u.xMid,u.yMidCurv=I.y+u.yMid;var k,R=(l.existsDrawnTransition(m.id,g.id),l.getDrawnTransition(m.id,g.id));k=R?R.names.length:1;var E,N,_=o(M,b),B=_.degree;B>90&&(B=90-B%90);var O=Math.pow(B/90,.5);E=u.approachTransition?40+8*k*O:12+8*k*O,N=a(M,D),N=s(N),N=r(N,E),u.xText=N.x+u.xMid,u.yText=N.y+u.yMid;var F=[];return F=u.approachTransition?[[u.xStart,u.yStart],[u.xMidCurv,u.yMidCurv],[u.xEnd,u.yEnd]]:[[u.xStart,u.yStart],[u.xEnd,u.yEnd]],u.path=l.bezierLine(F),u},l.writeTransitionText=function(e,a){e.selectAll("*").remove();for(var n=0;n<a.length;n++)null!==t.simulator.animated.transition&&a[n].id===t.simulator.animated.transition.id?e.append("tspan").attr("transition-id",a[n].id).text(a[n].name).classed("animated-transition-text",!0):e.append("tspan").attr("transition-id",a[n].id).text(a[n].name),n<a.length-1&&e.append("tspan").text(" | ")},l.drawTransition=function(e){var a=t.getTransitionById(e);if(!l.existsDrawnTransition(a.fromState,a.toState)){var n=l.svgTransitions.append("g").attr("class","transition"),i=(n.append("path").attr("class","transition-line-selection").attr("fill","none").attr("marker-end","url(#marker-end-arrow-selection)"),n.append("path").attr("class","transition-line").attr("fill","none").attr("marker-end","url(#marker-end-arrow)"),n.append("path").attr("class","transition-line-click").attr("stroke-width",20).attr("stroke","transparent").attr("fill","none"),n.append("path").attr("class","transition-line-hover").attr("fill","none").attr("marker-end","url(#marker-end-arrow-hover)"),n.append("text").attr("class","transition-text").attr("dominant-baseline","central").attr("fill","black"));if(a.fromState!=a.toState){var r=l.getTransitionDrawConfig(a);if(r.approachTransition){var s=l.getDrawnTransition(a.toState,a.fromState),o=l.getTransitionDrawConfig(s,!0);l.updateTransitionLines(s.objReference,o.path),s.objReference.select(".transition-text").attr("x",o.xText).attr("y",o.yText)}i.attr("class","transition-text").attr("x",r.xText).attr("y",r.yText),l.updateTransitionLines(n,r.path)}else{var c=t.getArrayStateIdByStateId(a.fromState),d=t.config.states[c].x,u=t.config.states[c].y;l.updateTransitionLines(n,l.selfTransition(d,u)),i.attr("x",d-l.settings.stateRadius-50).attr("y",u)}return n.attr("object-id",t.config.drawnTransitions.push({fromState:a.fromState,toState:a.toState,names:[{id:a.id,name:a.name}],objReference:n})-1),l.writeTransitionText(i,l.getDrawnTransition(a.fromState,a.toState).names),n.attr("from-state-id",a.fromState).attr("to-state-id",a.toState).on("click",l.openTransitionMenu).on("mouseover",function(){d3.select(this).select(".transition-line-hover").attr("style","opacity:0.6")}).on("mouseleave",function(){d3.select(this).select(".transition-line-hover").attr("style","")}),n}var f=l.getDrawnTransition(a.fromState,a.toState);f.names.push({id:a.id,name:a.name}),l.writeTransitionText(f.objReference.select(".transition-text"),l.getDrawnTransition(a.fromState,a.toState).names);var m=l.getTransitionDrawConfig(a);f.objReference.select(".transition-text").attr("x",m.xText).attr("y",m.yText)},l.updateTransitionLines=function(t,e){t.select(".transition-line").attr("d",e),t.select(".transition-line-selection").attr("d",e),t.select(".transition-line-hover").attr("d",e),t.select(".transition-line-click").attr("d",e)},l.openTransitionMenu=function(e){l.closeStateMenu(),l.closeTransitionMenu(),l.preventSvgOuterClick=!0,l.showTransitionMenu=!0;var a,n;if(void 0===e)a=d3.select(this).attr("from-state-id"),n=d3.select(this).attr("to-state-id"),l.selectedTransition=l.getDrawnTransition(a,n);else{var i=t.getTransitionById(e);a=i.fromState,n=i.toState,l.selectedTransition=l.getDrawnTransition(a,n)}l.selectedTransition.objReference.classed("active",!0),l.input={},l.input.fromState=t.getStateById(a),l.input.toState=t.getStateById(n),l.input.transitions=[],_.forEach(l.selectedTransition.names,function(t,a){var n={};n=cloneObject(t),void 0!==e?t.id==e&&(n.isFocus=!0):l.selectedTransition.names.length-1===a&&(n.isFocus=!0),n.ttt="",n.tttisopen=!1,l.input.transitions.push(n)}),l.transitionMenuListener=[];for(var r=0;r<l.input.transitions.length;r++)l.transitionMenuListener.push(t.$watchCollection("statediagram.input.transitions['"+r+"']",function(e,i){e.name!==i.name&&(e.tttisopen=!1,""===e.name||t.existsTransition(a,n,e.name)?""===e.name?(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_TOO_SHORT"):t.existsTransition(a,n,e.name,e.id)&&(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_ALREAD_EXISTS"):t.renameTransition(e.id,e.name),console.log(t.existsTransition(a,n,e.name,e.id)))}));t.safeApply()},l.closeTransitionMenu=function(){_.forEach(l.transitionMenuListener,function(t,e){t()}),l.showTransitionMenu=!1,null!==l.selectedTransition&&(l.selectedTransition.objReference.classed("active",!1),l.selectedTransition=null)},l.updateTransitionsAfterStateDrag=function(e){t.config.states[t.getArrayStateIdByStateId(e)].name,_.forEach(t.config.drawnTransitions,function(a,n){if(a.fromState==e||a.toState==e){var i=a.objReference,r=i.select("text");if(a.fromState!=a.toState){var s=l.getTransitionDrawConfig(a);l.updateTransitionLines(i,s.path),r.attr("x",s.xText).attr("y",s.yText)}else{var o=a.fromState,c=t.config.states[t.getArrayStateIdByStateId(o)].x,d=t.config.states[t.getArrayStateIdByStateId(o)].y;l.updateTransitionLines(i,l.selfTransition(c,d)),r.attr("x",c-l.settings.stateRadius-50).attr("y",d)}}})},t.$watch("simulator.animated.currentState",function(e,a){e!==a&&(console.log("CURRENTSTATE:oldValue "+a+" newvalue "+e),console.log("status"+t.simulator.status),null!==a&&(l.setStateClassAs(a,!1,"animated-currentstate-svg"),l.setStateClassAs(a,!1,"animated-accepted-svg"),l.setStateClassAs(a,!1,"animated-not-accepted-svg")),null!==e&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"):l.setStateClassAs(e,!0,"animated-currentstate-svg")))}),t.$watch("simulator.animated.transition",function(t,e){t!==e&&(null!==e&&(l.setTransitionClassAs(e.id,!1,"animated-transition"),d3.selectAll("[transition-id='"+e.id+"'").classed("animated-transition-text",!1)),null!==t&&(l.setTransitionClassAs(t.id,!0,"animated-transition"),console.log(t),d3.selectAll("[transition-id='"+t.id+"'").classed("animated-transition-text",!0)))}),t.$watch("simulator.animated.nextState",function(t,e){t!==e&&(console.log("NEXTSTATE: oldValue "+e+" newvalue "+t),null!==e&&l.setStateClassAs(e,!1,"animated-nextstate-svg"),null!==t&&l.setStateClassAs(t,!0,"animated-nextstate-svg"))}),t.$watch("simulator.status",function(e,a){e!==a&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status&&l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"))})}function StatetransitionfunctionDFA(t){"use strict";var e=this;e.functionData={},e.functionData.states=[],e.functionData.startState="",e.functionData.finalStates="",e.functionData.transitions="",e.functionData.statetransitionfunction=[],t.updateListeners.push(e),e.updateFunction=function(){var a,n="",i="",r="",s="";e.functionData.transitions=t.config.alphabet,e.functionData.states=[],_.forEach(t.config.states,function(a,i){n="";var r="";null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id&&(r="selected"),n+=a.id==t.simulator.animated.currentState&&"accepted"===t.simulator.status?'<span class="animated-accepted '+r+'">':a.id==t.simulator.animated.currentState&&"not accepted"===t.simulator.status?'<span class="animated-not-accepted '+r+'">':a.id==t.simulator.animated.currentState?'<span class="animated-currentstate '+r+'">':'<span class="'+r+'">',n+=a.name,n+="</span>",i<t.config.states.length-1&&(n+=", "),e.functionData.states.push(n)}),e.functionData.statetransitionfunction=[],_.forEach(t.config.states,function(a,n){_.forEach(t.config.transitions,function(n,r){if(n.fromState===a.id){var s=n,o=!1;null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{id:n.id})&&(o=!0);var c=!1;t.simulator.animated.transition&&t.simulator.animated.transition.id===s.id&&(c=!0),i=c||o?'(<span class=" '+(c?"animated-transition":"")+" "+(o?"selected":"")+'">':"(<span>",i+=t.getStateById(s.fromState).name+", ",i+=s.name+", ",i+=t.getStateById(s.toState).name+"</span>)",e.functionData.statetransitionfunction.push(i)}})}),a=t.getStateById(t.config.startState),void 0!==a&&(r+='<span class="">'+a.name+"</span>"),e.functionData.startState=r,_.forEach(t.config.finalStates,function(e,a){e=t.getStateById(e),s=e.name,a<t.config.finalStates.length-1&&(s+=", ")}),e.functionData.finalStates=s},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.status",function(t,a){t!==a&&e.updateFunction()})}function TableDFA(t){var e=this;e.states=[],t.updateListeners.push(e),e.updateFunction=function(){e.states=[],e.alphabet=[],t.config,_.forEach(t.config.alphabet,function(a,n){var i="";null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{name:a})&&(i="selected");var r;r=t.simulator.animated.transition&&t.simulator.animated.transition.name===a?'<span class="animated-transition '+i+'">'+a+"</span>":'<span class="'+i+'">'+a+"</span>",e.alphabet.push(r)}),_.forEach(t.config.states,function(a,n){var i={};i.id=a.id;var r="";if((null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id||null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.fromState===a.id)&&(r="selected"),t.simulator.animated.currentState==a.id){var s="";s="accepted"===t.simulator.status?"animated-accepted":"not accepted"===t.simulator.status?"animated-not-accepted":"animated-currentstate",i.name='<span class="'+s+" "+r+'">'+a.name+"</span>"}else i.name='<span class="'+r+'">'+a.name+"</span>";t.isStateAFinalState(a.id)?i.finalState=!0:i.finalState=!1,t.config.startState===a.id?i.startState=!0:i.startState=!1,i.trans=[],_.forEach(t.config.alphabet,function(e,n){var r=null;_.forEach(t.config.transitions,function(t,n){t.fromState===a.id&&t.name===e&&(r=t)});var s={};if(s.alphabet=e,null!==r){var o=t.getStateById(r.toState),c="";null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.toState===o.id&&(c="selected"),t.simulator.animated.nextState==o.id&&r.name==t.simulator.animated.transition.name?s.State='<span class="animated-nextstate '+c+'">'+o.name+"</span>":s.State='<span class="'+c+'">'+o.name+"</span>"}else s.State="";i.trans.push(s)}),e.states.push(i)})},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.nextState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()})}function SimulationDFA(t){"use strict";var e=this;e.isInPlay=!1,e.loopSimulation=!0,e.stepTimeOut=1500,e.loopTimeOut=2e3,e.simulationPaused=!1,e.simulationSettings=!0,e.currentState=null,e.nextState=null,e.transition=null,e.isInputAccepted=!1,e.settings=function(){e.simulationSettings=!e.simulationSettings},e.animated={currentState:null,transition:null,nextState:null},e.reset=function(){e.animated={currentState:null,transition:null,nextState:null},e.goneTransitions=[],e.currentState=t.config.startState,e.transition=null,e.animatedTransition=!1,e.nextState=null,e.animatedNextState=!1,e.isNextStepCalculated=!1,e.simulationStarted=!1,e.statusSequence=[t.config.startState],e.madeSteps=0,e.inputWord=t.config.inputWord,e.processedWord="",e.nextChar="",e.status="stopped"},e.pause=function(){e.simulationPaused||(e.simulationPaused=!0,
e.isInPlay=!1)},e.stop=function(){e.pause(),e.reset()},e.play=function(){e.simulationPaused||(e.simulationStarted?((e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&(e.animateNextMove(),t.safeApply(function(){}),(e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&setTimeout(e.play,e.stepTimeOut)),e.isNextStepCalculated||"accepted"!=e.status||(e.loopSimulation?setTimeout(e.play,e.loopTimeOut):e.isInPlay=!1,e.simulationStarted=!1,t.safeApply(function(){}))):e.prepareSimulation())},e.prepareSimulation=function(){e.reset(),e.simulationStarted=!0,e.animated.currentState=_.last(e.statusSequence),t.safeApply(),setTimeout(e.play,e.loopTimeOut)},e.animateNextMove=function(){e.isNextStepCalculated||e.calcNextStep(),e.animatedTransition?!e.animatedNextState&&e.animatedTransition?(e.animatedNextState=!0,e.animated.nextState=e.nextState):e.animatedTransition&&e.animatedNextState&&(e.animated.transition=null,e.animated.nextState=null,e.animated.currentState=e.nextState,e.currentState=e.nextState,e.madeSteps++,e.inputWord.length==e.madeSteps&&(_.include(t.config.finalStates,e.currentState)?e.status="accepted":e.status="not accepted"),e.isNextStepCalculated=!1,e.animatedNextState=!1,e.animatedTransition=!1,e.processedWord+=e.nextChar,e.statusSequence.push(e.currentState),"accepted"!==e.status&&"not accepted"!==e.status&&e.calcNextStep()):(e.animatedTransition=!0,e.animated.transition=e.transition,e.goneTransitions.push(e.transition))},e.calcNextStep=function(){return e.isNextStepCalculated=!0,e.status="step",e.nextChar=e.inputWord[e.madeSteps],e.transition=_.filter(t.config.transitions,function(t){return void 0===e.nextChar?void(e.status="not accepted"):t.fromState==_.last(e.statusSequence)&&t.name==e.nextChar}),_.isEmpty(e.transition)?(e.transition=null,void(e.status="not accepted")):(e.transition=e.transition[0],void(e.nextState=e.transition.toState))},e.stepForward=function(){if(e.simulationPaused||e.pause(),e.simulationStarted){if(!_.include(["step","stopped","accepted","not accepted"],e.status))return void console.log(e.status);_.include(["accepted","not accepted"],e.status)||e.animateNextMove()}else e.prepareSimulation(),e.status="step"},e.stepBackward=function(){e.simulationPaused||e.pause(),_.include(["step","accepted","not accepted"],e.status)&&(e.status="step",e.animatedTransition||e.animatedNextState||0!==e.madeSteps?e.animateLastMove():e.reset())},e.animateLastMove=function(){console.log(e.animatedTransition+" "+e.animatedNextState),e.animatedTransition&&e.animatedNextState?(e.animated.nextState=null,e.animatedNextState=!1):e.animatedTransition?(e.animated.transition=null,e.animatedTransition=!1,e.goneTransitions.pop()):e.calcLastStep()},e.calcLastStep=function(){e.nextChar=e.processedWord.slice(-1),console.log(e.nextChar+" "+e.statusSequence[e.statusSequence.length-2]),e.transition=_.last(e.goneTransitions),console.log(e.transition),_.pullAt(e.goneTransitions,e.goneTransitions.length),e.animatedTransition=!0,e.animated.transition=e.transition;var t=e.currentState;e.currentState=e.transition.fromState,e.nextState=t,e.animated.nextState=e.nextState,e.animatedNextState=!0,e.animated.currentState=e.currentState,e.madeSteps--,e.statusSequence.splice(-1,1),e.processedWord=e.processedWord.slice(0,-1)},e.getNextTransition=function(e,a){for(var n=0;n<t.config.transitions.length;n++){var i=t.config.transitions[n];if(i.fromState==e&&i.name==a)return i}},e.check=function(){var a=!1,n=[];n.push(t.config.startState);for(var i="",r=0,s=null;r<=t.config.inputWord.length&&(i=t.config.inputWord[r],s=e.getNextTransition(_.last(n),i),!_.isEmpty(s));)if(n.push(s.toState),r++,t.config.inputWord.length==r){if(_.include(t.config.finalStates,_.last(n))){a=!0;break}break}return a},e.isPlayable=function(){return t.config.states.length>=1&&t.config.transitions.length>=1&&null!==t.config.startState&&t.config.finalStates.length>=1},e.playOrPause=function(){e.isPlayable()&&(e.isInPlay=!e.isInPlay,e.isInPlay?(e.simulationPaused=!1,e.play()):e.pause())},t.updateListeners.push(e),e.updateFunction=function(){e.isInputAccepted=e.check()}}function StateDiagramDFA(t,e){"use strict";function a(t,e){var a={x:t.y*e.z,y:-t.x*e.z};return a}function n(t){return t*(180/Math.PI)}function i(t){return t*(Math.PI/180)}function r(t,e){return{x:t.x*e,y:t.y*e}}function s(t){var e=1/Math.sqrt(t.x*t.x+t.y*t.y);return{x:t.x*e,y:t.y*e}}function o(t,e){var a=(t.x*e.x+t.y*e.y)/(Math.sqrt(t.x*t.x+t.y*t.y)*Math.sqrt(e.x*e.x+e.y*e.y)),i=Math.acos(a);return{val:a,rad:i,degree:n(i)}}function c(t,e){var a=t.x*e.x+t.y*e.y,n=t.x*e.y-t.y*e.x;return Math.atan2(n,a)}function d(t,e){var a=n(c(t,e));0>a&&(a+=360);var i=a+g;i>360&&(i-=360);var r=a-g;return 0>r&&(r+=360),{angle:a,lowerAngle:r,upperAngle:i}}var l=this;l.preventStateDragging=!1,l.inAddTransition=!1,l.selectedState=null,l.preventSvgOuterClick=!1,l.selectedTransition=null,l.showStateMenu=!1,l.showTransitionMenu=!1,l.selectedStateName="selectedForTransition",l.snapping=!0,l.settings={stateRadius:25,finalStateRadius:29,selected:!1};var u=40,f=18;l.stateSelfReferenceNumber=Math.sin(45*(Math.PI/180))*l.settings.stateRadius,l.existsDrawnTransition=function(e,a){for(var n=!1,i=0;i<t.config.drawnTransitions.length;i++){var r=t.config.drawnTransitions[i];r.fromState==e&&r.toState==a&&(n=!0)}return n},l.getDrawnTransition=function(e,a){for(var n=0;n<t.config.drawnTransitions.length;n++){var i=t.config.drawnTransitions[n];if(i.fromState==e&&i.toState==a)return i}},l.clearSvgContent=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgTransitions.html(""),l.svgStates.html(""),t.config.drawnTransitions=[],l.svg.attr("transform","translate("+t.defaultConfig.diagramm.x+","+t.defaultConfig.diagramm.y+") scale("+t.defaultConfig.diagramm.scale+")"),m.scale(t.defaultConfig.diagramm.scale),m.translate([t.defaultConfig.diagramm.x,t.defaultConfig.diagramm.y])},l.zoomMax=2.5,l.zoomMin=.5,l.zoomValue=.1,l.zoomIn=function(){t.config.diagramm.scale=t.config.diagramm.scale+l.zoomValue>l.zoomMax?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale+l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomOut=function(){t.config.diagramm.scale=t.config.diagramm.scale-l.zoomValue<=l.zoomMin?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale-l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomTo=function(e){console.log("zoomtedto"),t.config.diagramm.scale=e/100,t.safeApply(),l.updateZoomBehaviour()},l.updateZoomBehaviour=function(){t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")"),m.scale(t.config.diagramm.scale),m.translate([t.config.diagramm.x,t.config.diagramm.y])},l.zoomFitWindow=function(){var e,a=[],n=[],i=0,r=0,s=0,o=0,c=0,d=0,u=l.svgOuter.style("width").replace("px",""),f=l.svgOuter.style("height").replace("px","");if(t.config.diagramm.scale=1,t.config.states.length>0){for(e=0;e<t.config.states.length;e++)a[e]=t.config.states[e].x;for(e=0;e<t.config.states.length;e++)n[e]=t.config.states[e].y;for(i=_.min(a),r=_.max(a),s=_.min(n),o=_.max(n);r-i+150>u/t.config.diagramm.scale||o-s+200>f/t.config.diagramm.scale;)t.config.diagramm.scale-=.01;t.safeApply(),c=(f/t.config.diagramm.scale-(o-s))/2,d=(u/t.config.diagramm.scale-(r-i))/2,t.config.diagramm.x=-(i*t.config.diagramm.scale)+d*t.config.diagramm.scale,t.config.diagramm.y=-(s*t.config.diagramm.scale)+c*t.config.diagramm.scale,l.updateZoomBehaviour()}else l.scaleAndTranslateToDefault()},l.scaleAndTranslateToDefault=function(){t.config.diagramm.scale=t.defaultConfig.diagramm.scale,t.config.diagramm.x=t.defaultConfig.diagramm.x,t.config.diagramm.y=t.defaultConfig.diagramm.y,t.safeApply(),l.updateZoomBehaviour()};var m=d3.behavior.zoom().scaleExtent([l.zoomMin,l.zoomMax]).on("zoom",function(){var e=d3.event.button||d3.event.ctrlKey;if(e&&d3.event.stopImmediatePropagation(),3!==d3.event.sourceEvent.which){var a=Math.floor(100*d3.event.scale)/100;t.config.diagramm.scale=a,t.config.diagramm.x=d3.event.translate[0],t.config.diagramm.y=d3.event.translate[1],t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")")}else console.log("rightclick!")});l.svgOuter=d3.select(e).call(m).on("dblclick.zoom",null).on("contextmenu",function(){d3.event.preventDefault()}),l.addSvgOuterClickListener=function(){l.svgOuter.on("click",function(){l.preventSvgOuterClick?l.preventSvgOuterClick=!1:(l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply())})},l.addSvgOuterClickListener(),l.svgGrid=l.svgOuter.append("g").attr("id","grid"),l.svg=l.svgOuter.append("g").attr("id","svg-items"),l.svgTransitions=l.svg.append("g").attr("id","transitions"),l.svgStates=l.svg.append("g").attr("id","states"),l.gridSpace=100,l.gridSnapDistance=20,l.isGrid=!0,t.$watch("[statediagram.isGrid , config.diagramm]",function(){l.drawGrid()},!0),l.drawGrid=function(){if(l.isGrid){l.svgGrid.html("");var e,a=l.svgOuter.style("width").replace("px",""),n=l.svgOuter.style("height").replace("px",""),i=1*t.config.diagramm.scale*.5,r=t.config.diagramm.x%(l.gridSpace*t.config.diagramm.scale),s=t.config.diagramm.y%(l.gridSpace*t.config.diagramm.scale);for(e=r;a>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line xgrid-line").attr("x1",e).attr("y1",0).attr("x2",e).attr("y2",n);for(e=s;n>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line ygrid-line").attr("x1",0).attr("y1",e).attr("x2",a).attr("y2",e)}else l.svgGrid.html("")},l.defs=l.svg.append("svg:defs"),l.defs.append("svg:marker").attr("id","marker-end-arrow").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-create").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-animated").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-hover").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-selection").attr("refX",4).attr("refY",3).attr("markerWidth",5).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.resetAddActions=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgOuter.on("click",null),l.inAddTransition=!1,l.inAddState=!1},l.addState=function(){l.resetAddActions(),l.svgOuter.on("mousemove",function(){l.selectedState.objReference.attr("transform","translate("+(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale)+" "+(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale)+")")}),l.selectedState=t.addStateWithPresets(-1e4,-1e4),l.selectedState.objReference.classed("state-in-creation",!0),l.svgOuter.on("click",function(){l.selectedState.objReference.classed("state-in-creation",!1),l.selectedState.x=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),l.selectedState.y=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),l.selectedState.objReference.attr("transform","translate("+l.selectedState.x+" "+l.selectedState.y+")"),l.svgOuter.on("mousemove",null),l.addSvgOuterClickListener(),l.preventSvgOuterClick=!1,t.safeApply()})},l.addTransition=function(){l.resetAddActions(),l.preventStateDragging=!0,d3.selectAll(".state").on("click",function(){if(l.mouseInState=!0,null===l.selectedState)l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.tmpTransition=l.svgTransitions.append("g").attr("class","transition"),l.tmpTransitionline=l.tmpTransition.append("path").attr("class","transition-line curvedLine in-creation").attr("marker-end","url(#marker-end-arrow-create)").attr("fill","none");else{var e=t.addTransition(l.selectedState.id,parseInt(d3.select(this).attr("object-id")),t.getNextTransitionName(l.selectedState.id));l.toggleState(l.selectedState.id,!1),l.tmpTransition.remove(),l.tmpTransition=null,l.tmpTransitionline=null,l.preventStateDragging=!1,l.addSvgOuterClickListener(),l.svgOuter.on("mousemove",null),d3.selectAll(".state").on("mouseover",null),d3.selectAll(".state").on("mouseleave",null),d3.selectAll(".state").on("click",l.openStateMenu),l.openTransitionMenu(e.id)}}),l.svgOuter.on("mousemove",function(){if(!l.mouseInState&&null!==l.selectedState){var e=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),a=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),n=l.bezierLine([[l.selectedState.x,l.selectedState.y],[e,a]]);l.tmpTransitionline.attr("d",n)}}),d3.selectAll(".state").on("mouseover",function(e){if(l.mouseInState=!0,null!==l.selectedState){var a=t.getStateById(d3.select(this).attr("object-id")),n={};n.fromState=l.selectedState.id,n.toState=a.id;var i=l.tmpTransitionline;if(l.existsDrawnTransition(l.selectedState.fromState,l.selectedState.toState)){var r=l.getDrawnTransition(n.fromState,n.toState);r.names.push(n.name),l.writeTransitionText(r.objReference.select(".transition-text"),r.names)}else if(n.fromState!=n.toState){var s=l.getTransitionDrawConfig(n);if(s.approachTransition){var o=l.getDrawnTransition(n.toState,n.fromState),c=l.getTransitionDrawConfig(o,!0);l.updateTransitionLines(o.objReference,c.path),o.objReference.select(".transition-text").attr("x",c.xText).attr("y",c.yText),l.otherTransition=o}i.attr("d",s.path)}else{var d=t.getArrayStateIdByStateId(n.fromState),u=t.config.states[d].x,f=t.config.states[d].y;i.attr("d",l.selfTransition(u,f))}l.tmpTransitionline.attr("x1",l.selectedState.x).attr("y1",l.selectedState.y).attr("x2",a.x).attr("y2",a.y)}}).on("mouseleave",function(){if(l.mouseInState=!1,null!==l.otherTransition&&void 0!==l.otherTransition){var t=l.getTransitionDrawConfig(l.otherTransition);l.updateTransitionLines(l.otherTransition.objReference,t.path),l.otherTransition.objReference.select(".transition-text").attr("x",t.xText).attr("y",t.yText)}})},l.renameState=function(e,a){var n=t.config.states[t.getArrayStateIdByStateId(e)],i=n.objReference;i.select("text").text(a)},l.removeState=function(e){l.closeStateMenu();var a=t.config.states[t.getArrayStateIdByStateId(e)],n=a.objReference;n.remove()},l.renameTransition=function(t,e,a,n){var i=l.getDrawnTransition(t,e),r=_.find(i.names,{id:a});r.name=n,l.writeTransitionText(i.objReference.select(".transition-text"),i.names)},l.removeTransition=function(e){var a=t.getTransitionById(e),n=l.getDrawnTransition(a.fromState,a.toState),i=l.getTransitionDrawConfig(a);if(l.closeTransitionMenu(),1===n.names.length){if(n.objReference.remove(),_.remove(t.config.drawnTransitions,function(t){return t==n}),i.approachTransition){var r=l.getDrawnTransition(a.toState,a.fromState),s=l.getTransitionDrawConfig(r,!1);l.updateTransitionLines(r.objReference,s.path),r.objReference.select(".transition-text").attr("x",s.xText).attr("y",s.yText),l.otherTransition=r}}else _.remove(n.names,function(t){return t.id==a.id}),l.writeTransitionText(n.objReference.select(".transition-text"),n.names),i=l.getTransitionDrawConfig(a),n.objReference.select(".transition-text").attr("x",i.xText).attr("y",i.yText),console.log(n),l.openTransitionMenu(n.names[n.names.length-1].id)},l.addFinalState=function(e){var a=t.getStateById(e);a.objReference.insert("circle",".state-circle").attr("class","final-state").attr("r",l.settings.finalStateRadius)},l.removeFinalState=function(e){var a=t.getStateById(e);a.objReference.select(".final-state").remove()},l.changeStartState=function(e){if(null!==t.config.startState){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove()}var n=t.getStateById(e);n.objReference.append("line").attr("class","transition-line start-line").attr("x1",0).attr("y1",-75).attr("x2",0).attr("y2",0-l.settings.stateRadius-4).attr("marker-end","url(#marker-end-arrow)")},l.removeStartState=function(e){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove(),t.config.startState=null,t.updateListener()},l.drawState=function(e){var a=t.getStateById(e),n=l.svgStates.append("g").attr("transform","translate("+a.x+" "+a.y+")").attr("class","state state-"+a.id).attr("object-id",a.id);n.append("circle").attr("class","state-circle").attr("r",l.settings.stateRadius),n.append("circle").attr("class","state-circle hover-circle").attr("r",l.settings.stateRadius),n.append("text").text(a.name).attr("class","state-text").attr("dominant-baseline","central").attr("text-anchor","middle");return a.objReference=n,n.on("click",l.openStateMenu).call(l.dragState),n},l.setStateClassAs=function(e,a,n){var i=t.getStateById(e).objReference;i.classed(n,a)},l.setTransitionClassAs=function(e,a,n){var i=t.getTransitionById(e),r=l.getDrawnTransition(i.fromState,i.toState).objReference;r.classed(n,a),a&&"animated-transition"==n?r.select(".transition-line").attr("marker-end","url(#marker-end-arrow-animated)"):r.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.setArrowMarkerTo=function(t,e){""!==e?t.select(".transition-line").attr("marker-end","url(#marker-end-arrow-"+e+")"):t.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.openStateMenu=function(){console.log("open state menu"),l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply(),l.preventSvgOuterClick=!0,l.showStateMenu=!0,l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.input={},l.input.state=l.selectedState,l.input.stateName=l.selectedState.name,l.input.startState=t.config.startState==l.selectedState.id,l.input.finalState=t.isStateAFinalState(l.selectedState.id),l.input.ttt="",l.input.tttisopen=!1,t.safeApply(),l.stateMenuListener=[],l.stateMenuListener.push(t.$watch("statediagram.input.startState",function(e,a){e!==a&&(l.input.startState?t.changeStartState(l.input.state.id):l.selectedState.id==t.config.startState&&t.removeStartState())})),l.stateMenuListener.push(t.$watch("statediagram.input.finalState",function(e,a){e!==a&&(l.input.finalState?t.addFinalState(l.input.state.id):t.removeFinalState(l.input.state.id))})),l.stateMenuListener.push(t.$watch("statediagram.input.stateName",function(e,a){if(l.input.tttisopen=!1,e!==a)if(""===e||t.existsStateWithName(e))""===e?(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_TOO_SHORT"):t.existsStateWithName(e,l.input.state.id)&&(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_ALREADY_EXIST");else{!t.renameState(l.input.state.id,e)}}))},l.closeStateMenu=function(){_.forEach(l.stateMenuListener,function(t,e){t()}),null!==l.selectedState&&l.toggleState(l.selectedState.id,!1),l.stateMenuListener=null,l.showStateMenu=!1,l.input=null},l.toggleState=function(t,e){l.setStateClassAs(t,e,"active"),e===!1&&(l.selectedState=null)},l.dragState=d3.behavior.drag().on("dragstart",function(){l.dragAmount=0,d3.event.sourceEvent.stopPropagation()}).on("drag",function(){if(1==d3.event.sourceEvent.which&&!l.preventStateDragging){l.dragAmount++;var e=d3.event.x,a=d3.event.y;if(l.snapping){var n=e-e%l.gridSpace,i=a-a%l.gridSpace;e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n,a=i):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n+l.gridSpace,a=i):e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance?(e=n,a=i+l.gridSpace):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance&&(e=n+l.gridSpace,a=i+l.gridSpace)}if(l.dragAmount>1){d3.select(this).attr("transform","translate("+e+" "+a+")");var r=d3.select(this).attr("object-id"),s=t.getStateById(r);s.x=e,s.y=a,l.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"))}}}).on("dragend",function(){l.dragAmount>1&&t.safeApply()}),l.selfTransition=function(t,e){return l.bezierLine([[t-l.stateSelfReferenceNumber,e-l.stateSelfReferenceNumber],[t-l.stateSelfReferenceNumber-u,e-l.stateSelfReferenceNumber-f],[t-l.stateSelfReferenceNumber-u,e+l.stateSelfReferenceNumber+f],[t-l.stateSelfReferenceNumber,e+l.stateSelfReferenceNumber]])};var g=30;l.bezierLine=d3.svg.line().x(function(t){return t[0]}).y(function(t){return t[1]}).interpolate("basis"),l.getTransitionDrawConfig=function(e,n){var c=3,u={};u.approachTransition=n||l.existsDrawnTransition(e.toState,e.fromState);var f,m=t.getStateById(e.fromState),g=t.getStateById(e.toState),S=t.isStateAFinalState(e.toState),p=m.x,v=m.y,h=g.x,T=g.y,x={x:h-p,y:T-v},y=Math.sqrt(x.x*x.x+x.y*x.y),A=l.settings.stateRadius/y;f=S?(l.settings.stateRadius+c+5)/y:(l.settings.stateRadius+c)/y,u.xStart=p+A*x.x,u.yStart=v+A*x.y,u.xEnd=h-f*x.x,u.yEnd=T-f*x.y,u.xDiff=h-p,u.yDiff=T-v,u.xMid=(p+h)/2,u.yMid=(v+T)/2,u.distance=Math.sqrt(u.xDiff*u.xDiff+u.yDiff*u.yDiff);var w,I,M={x:u.xMid-u.xStart,y:u.yMid-u.yStart,z:0},D={x:0,y:0,z:1},b={x:1,y:0,z:0};if(w=20,I=a(M,D),I=s(I),I=r(I,w),u.approachTransition){var C=d({x:u.xStart-p,y:u.yStart-v},{x:l.settings.stateRadius,y:0}),L=d({x:u.xEnd-h,y:u.yEnd-T},{x:l.settings.stateRadius,y:0});u.xStart=p+l.settings.stateRadius*Math.cos(i(C.upperAngle)),u.yStart=v-l.settings.stateRadius*Math.sin(i(C.upperAngle)),u.xEnd=h+l.settings.stateRadius*Math.cos(i(L.lowerAngle)),u.yEnd=T-l.settings.stateRadius*Math.sin(i(L.lowerAngle))}w=35,I=a(M,D),I=s(I),I=r(I,w),u.xMidCurv=I.x+u.xMid,u.yMidCurv=I.y+u.yMid;var k,R=(l.existsDrawnTransition(m.id,g.id),l.getDrawnTransition(m.id,g.id));k=R?R.names.length:1;var E,N,_=o(M,b),B=_.degree;B>90&&(B=90-B%90);var O=Math.pow(B/90,.5);E=u.approachTransition?40+8*k*O:12+8*k*O,N=a(M,D),N=s(N),N=r(N,E),u.xText=N.x+u.xMid,u.yText=N.y+u.yMid;var F=[];return F=u.approachTransition?[[u.xStart,u.yStart],[u.xMidCurv,u.yMidCurv],[u.xEnd,u.yEnd]]:[[u.xStart,u.yStart],[u.xEnd,u.yEnd]],u.path=l.bezierLine(F),u},l.writeTransitionText=function(e,a){e.selectAll("*").remove();for(var n=0;n<a.length;n++)null!==t.simulator.animated.transition&&a[n].id===t.simulator.animated.transition.id?e.append("tspan").attr("transition-id",a[n].id).text(a[n].name).classed("animated-transition-text",!0):e.append("tspan").attr("transition-id",a[n].id).text(a[n].name),n<a.length-1&&e.append("tspan").text(" | ")},l.drawTransition=function(e){var a=t.getTransitionById(e);if(!l.existsDrawnTransition(a.fromState,a.toState)){var n=l.svgTransitions.append("g").attr("class","transition"),i=(n.append("path").attr("class","transition-line-selection").attr("fill","none").attr("marker-end","url(#marker-end-arrow-selection)"),n.append("path").attr("class","transition-line").attr("fill","none").attr("marker-end","url(#marker-end-arrow)"),n.append("path").attr("class","transition-line-click").attr("stroke-width",20).attr("stroke","transparent").attr("fill","none"),n.append("path").attr("class","transition-line-hover").attr("fill","none").attr("marker-end","url(#marker-end-arrow-hover)"),n.append("text").attr("class","transition-text").attr("dominant-baseline","central").attr("fill","black"));if(a.fromState!=a.toState){var r=l.getTransitionDrawConfig(a);if(r.approachTransition){var s=l.getDrawnTransition(a.toState,a.fromState),o=l.getTransitionDrawConfig(s,!0);l.updateTransitionLines(s.objReference,o.path),s.objReference.select(".transition-text").attr("x",o.xText).attr("y",o.yText)}i.attr("class","transition-text").attr("x",r.xText).attr("y",r.yText),l.updateTransitionLines(n,r.path)}else{var c=t.getArrayStateIdByStateId(a.fromState),d=t.config.states[c].x,u=t.config.states[c].y;l.updateTransitionLines(n,l.selfTransition(d,u)),i.attr("x",d-l.settings.stateRadius-50).attr("y",u)}return n.attr("object-id",t.config.drawnTransitions.push({fromState:a.fromState,toState:a.toState,names:[{id:a.id,name:a.name}],objReference:n})-1),l.writeTransitionText(i,l.getDrawnTransition(a.fromState,a.toState).names),n.attr("from-state-id",a.fromState).attr("to-state-id",a.toState).on("click",l.openTransitionMenu).on("mouseover",function(){d3.select(this).select(".transition-line-hover").attr("style","opacity:0.6")}).on("mouseleave",function(){d3.select(this).select(".transition-line-hover").attr("style","")}),n}var f=l.getDrawnTransition(a.fromState,a.toState);f.names.push({id:a.id,name:a.name}),l.writeTransitionText(f.objReference.select(".transition-text"),l.getDrawnTransition(a.fromState,a.toState).names);var m=l.getTransitionDrawConfig(a);f.objReference.select(".transition-text").attr("x",m.xText).attr("y",m.yText)},l.updateTransitionLines=function(t,e){t.select(".transition-line").attr("d",e),t.select(".transition-line-selection").attr("d",e),t.select(".transition-line-hover").attr("d",e),t.select(".transition-line-click").attr("d",e)},l.openTransitionMenu=function(e){l.closeStateMenu(),l.closeTransitionMenu(),l.preventSvgOuterClick=!0,l.showTransitionMenu=!0;var a,n;if(void 0===e)a=d3.select(this).attr("from-state-id"),n=d3.select(this).attr("to-state-id"),l.selectedTransition=l.getDrawnTransition(a,n);else{var i=t.getTransitionById(e);a=i.fromState,n=i.toState,l.selectedTransition=l.getDrawnTransition(a,n)}l.selectedTransition.objReference.classed("active",!0),l.input={},l.input.fromState=t.getStateById(a),l.input.toState=t.getStateById(n),l.input.transitions=[],_.forEach(l.selectedTransition.names,function(t,a){var n={};n=cloneObject(t),void 0!==e?t.id==e&&(n.isFocus=!0):l.selectedTransition.names.length-1===a&&(n.isFocus=!0),n.ttt="",n.tttisopen=!1,l.input.transitions.push(n)}),l.transitionMenuListener=[];for(var r=0;r<l.input.transitions.length;r++)l.transitionMenuListener.push(t.$watchCollection("statediagram.input.transitions['"+r+"']",function(e,i){e.name!==i.name&&(e.tttisopen=!1,""===e.name||t.existsTransition(a,n,e.name)?""===e.name?(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_TOO_SHORT"):t.existsTransition(a,n,e.name,e.id)&&(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_ALREAD_EXISTS"):t.renameTransition(e.id,e.name),console.log(t.existsTransition(a,n,e.name,e.id)))}));t.safeApply()},l.closeTransitionMenu=function(){_.forEach(l.transitionMenuListener,function(t,e){t()}),l.showTransitionMenu=!1,null!==l.selectedTransition&&(l.selectedTransition.objReference.classed("active",!1),l.selectedTransition=null)},l.updateTransitionsAfterStateDrag=function(e){t.config.states[t.getArrayStateIdByStateId(e)].name;_.forEach(t.config.drawnTransitions,function(a,n){if(a.fromState==e||a.toState==e){var i=a.objReference,r=i.select("text");if(a.fromState!=a.toState){var s=l.getTransitionDrawConfig(a);l.updateTransitionLines(i,s.path),r.attr("x",s.xText).attr("y",s.yText)}else{var o=a.fromState,c=t.config.states[t.getArrayStateIdByStateId(o)].x,d=t.config.states[t.getArrayStateIdByStateId(o)].y;l.updateTransitionLines(i,l.selfTransition(c,d)),r.attr("x",c-l.settings.stateRadius-50).attr("y",d)}}})},t.$watch("simulator.animated.currentState",function(e,a){e!==a&&(console.log("CURRENTSTATE:oldValue "+a+" newvalue "+e),console.log("status"+t.simulator.status),null!==a&&(l.setStateClassAs(a,!1,"animated-currentstate-svg"),l.setStateClassAs(a,!1,"animated-accepted-svg"),l.setStateClassAs(a,!1,"animated-not-accepted-svg")),null!==e&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"):l.setStateClassAs(e,!0,"animated-currentstate-svg")))}),t.$watch("simulator.animated.transition",function(t,e){t!==e&&(null!==e&&(l.setTransitionClassAs(e.id,!1,"animated-transition"),d3.selectAll("[transition-id='"+e.id+"'").classed("animated-transition-text",!1)),null!==t&&(l.setTransitionClassAs(t.id,!0,"animated-transition"),console.log(t),d3.selectAll("[transition-id='"+t.id+"'").classed("animated-transition-text",!0)))}),t.$watch("simulator.animated.nextState",function(t,e){t!==e&&(console.log("NEXTSTATE: oldValue "+e+" newvalue "+t),null!==e&&l.setStateClassAs(e,!1,"animated-nextstate-svg"),null!==t&&l.setStateClassAs(t,!0,"animated-nextstate-svg"))}),t.$watch("simulator.status",function(e,a){e!==a&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status&&l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"))})}function StatetransitionfunctionDFA(t){"use strict";var e=this;e.functionData={},e.functionData.states=[],e.functionData.startState="",e.functionData.finalStates="",e.functionData.transitions="",e.functionData.statetransitionfunction=[],t.updateListeners.push(e),e.updateFunction=function(){var a,n="",i="",r="",s="";e.functionData.transitions=t.config.alphabet,e.functionData.states=[],_.forEach(t.config.states,function(a,i){n="";var r="";null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id&&(r="selected"),n+=a.id==t.simulator.animated.currentState&&"accepted"===t.simulator.status?'<span class="animated-accepted '+r+'">':a.id==t.simulator.animated.currentState&&"not accepted"===t.simulator.status?'<span class="animated-not-accepted '+r+'">':a.id==t.simulator.animated.currentState?'<span class="animated-currentstate '+r+'">':'<span class="'+r+'">',n+=a.name,n+="</span>",i<t.config.states.length-1&&(n+=", "),e.functionData.states.push(n)}),e.functionData.statetransitionfunction=[],_.forEach(t.config.states,function(a,n){_.forEach(t.config.transitions,function(n,r){if(n.fromState===a.id){var s=n,o=!1;null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{id:n.id})&&(o=!0);var c=!1;t.simulator.animated.transition&&t.simulator.animated.transition.id===s.id&&(c=!0),i=c||o?'(<span class=" '+(c?"animated-transition":"")+" "+(o?"selected":"")+'">':"(<span>",i+=t.getStateById(s.fromState).name+", ",i+=s.name+", ",i+=t.getStateById(s.toState).name+"</span>)",e.functionData.statetransitionfunction.push(i)}})}),a=t.getStateById(t.config.startState),void 0!==a&&(r+='<span class="">'+a.name+"</span>"),e.functionData.startState=r,_.forEach(t.config.finalStates,function(e,a){e=t.getStateById(e),s=e.name,a<t.config.finalStates.length-1&&(s+=", ")}),e.functionData.finalStates=s},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.status",function(t,a){t!==a&&e.updateFunction()})}function TableDFA(t){var e=this;e.states=[],t.updateListeners.push(e),e.updateFunction=function(){e.states=[],e.alphabet=[];t.config;_.forEach(t.config.alphabet,function(a,n){var i="";null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{name:a})&&(i="selected");var r;r=t.simulator.animated.transition&&t.simulator.animated.transition.name===a?'<span class="animated-transition '+i+'">'+a+"</span>":'<span class="'+i+'">'+a+"</span>",e.alphabet.push(r)}),_.forEach(t.config.states,function(a,n){var i={};i.id=a.id;var r="";if((null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id||null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.fromState===a.id)&&(r="selected"),t.simulator.animated.currentState==a.id){var s="";s="accepted"===t.simulator.status?"animated-accepted":"not accepted"===t.simulator.status?"animated-not-accepted":"animated-currentstate",i.name='<span class="'+s+" "+r+'">'+a.name+"</span>";
}else i.name='<span class="'+r+'">'+a.name+"</span>";t.isStateAFinalState(a.id)?i.finalState=!0:i.finalState=!1,t.config.startState===a.id?i.startState=!0:i.startState=!1,i.trans=[],_.forEach(t.config.alphabet,function(e,n){var r=null;_.forEach(t.config.transitions,function(t,n){t.fromState===a.id&&t.name===e&&(r=t)});var s={};if(s.alphabet=e,null!==r){var o=t.getStateById(r.toState),c="";null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.toState===o.id&&(c="selected"),t.simulator.animated.nextState==o.id&&r.name==t.simulator.animated.transition.name?s.State='<span class="animated-nextstate '+c+'">'+o.name+"</span>":s.State='<span class="'+c+'">'+o.name+"</span>"}else s.State="";i.trans.push(s)}),e.states.push(i)})},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.nextState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()})}function DFA(t,e){"use strict";window.debugScope=t,t.defaultConfig={},t.defaultConfig.statePrefix="S",t.defaultConfig.transitionNameSuffix="|",t.defaultConfig.diagramm={x:0,y:0,scale:1,updatedWithZoomBehavior:!1},t.defaultConfig.countStateId=0,t.defaultConfig.countTransitionId=0,t.defaultConfig.states=[],t.defaultConfig.startState=null,t.defaultConfig.finalStates=[],t.defaultConfig.transitions=[],t.defaultConfig.alphabet=[],t.defaultConfig.inputWord="",t.defaultConfig.name="Untitled Automaton",t.defaultConfig.unSavedChanges=!1,t.defaultConfig.drawnTransitions=[],t.config=cloneObject(t.defaultConfig),t.updateListeners=[],t.simulator=new SimulationDFA(t),t.table=new TableDFA(t),t.statediagram=new StateDiagramDFA(t,"#diagramm-svg"),t.statetransitionfunction=new StatetransitionfunctionDFA(t),t.testData=new TestData(t),t.inNameEdit=!1,t.showModalWithMessage=function(e,a,n,i){t.title=e,t.description=a,t.modalAction=n,void 0===i?t.button="MODAL_BUTTON.PROCEED":t.button=i,$("#modal").modal()},t.executeModalAction=function(){t.$eval(t.modalAction)},t.stepTimeOutSlider={options:{floor:0,step:100,ceil:3e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.loopTimeOutSlider={options:{floor:0,step:100,ceil:4e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.keypressCallback=function(t){13==t.charCode&&document.getElementById("automatonNameEdit").blur()},window.onbeforeunload=function(e){if(t.config.unSavedChanges){var a="All Changes will be Lost. Save before continue!";return"undefined"==typeof e&&(e=window.event),e&&(e.returnValue=a),a}},t.saveAutomaton=function(){t.config.unSavedChanges=!1},t.safeApply=function(t){var e=this.$root.$$phase;"$apply"==e||"$digest"==e?t&&"function"==typeof t&&t():this.$apply(t)},t.resetAutomaton=function(){t.statediagram.clearSvgContent(),t.simulator.reset(),t.config=cloneObject(t.defaultConfig),t.safeApply(),t.updateListener()},t.addToAlphabet=function(e){_.some(t.config.alphabet,function(t){return t===e})||t.config.alphabet.push(e)},t.removeFromAlphabetIfNotUsedFromOthers=function(e){for(var a=t.getTransitionById(e),n=!1,i=0;i<t.config.transitions.length;i++)if(a.name===t.config.transitions[i].name&&t.config.transitions[i].id!==e)return void(n=!0);return n?!1:(_.pull(t.config.alphabet,a.name),!0)},t.updateListener=function(){_.forEach(t.updateListeners,function(t,e){t.updateFunction()}),t.config.unSavedChanges=!0},t.existsStateWithName=function(e,a){var n=!1;return _.forEach(t.config.states,function(t){return t.name==e&&t.id!==a?void(n=!0):void 0}),n},t.existsStateWithId=function(e){for(var a=0;a<t.config.states.length;a++)if(t.config.states[a].id==e)return!0;return!1},t.hasStateTransitions=function(e){var a=!1;return _.forEach(t.config.transitions,function(t){t.fromState!=e&&t.toState!=e||(a=!0)}),a},t.getArrayStateIdByStateId=function(e){return _.findIndex(t.config.states,function(t){return t.id==e?t:void 0})},t.getStateById=function(e){return t.config.states[t.getArrayStateIdByStateId(e)]},t.getStateByName=function(e){return t.config.states[t.getArrayStateIdByStateId(function(t){})]},t.addStateWithPresets=function(e,a){var n=t.addState(t.config.statePrefix+t.config.countStateId,e,a);return 1==t.config.countStateId&&t.changeStartState(0),n},t.addState=function(e,a,n){return t.existsStateWithName(e)?null:t.addStateWithId(t.config.countStateId++,e,a,n)},t.addStateWithId=function(e,a,n,i){return t.config.states.push(new State(e,a,n,i)),t.statediagram.drawState(e),t.updateListener(),t.safeApply(),t.getStateById(e)},t.removeState=function(e){t.hasStateTransitions(e)?t.showModalWithMessage("STATE_MENU.DELETE_MODAL_TITLE","STATE_MENU.DELETE_MODAL_DESC","forcedRemoveState("+e+")","MODAL_BUTTON.DELETE"):(t.isStateAFinalState(e)&&t.removeFinalState(e),t.config.startState==e&&(t.config.startState=null),t.statediagram.removeState(e),t.config.states.splice(t.getArrayStateIdByStateId(e),1),t.updateListener())},t.forcedRemoveState=function(e){for(var a=0;a<t.config.transitions.length;a++){var n=t.config.transitions[a];n.fromState!==e&&n.toState!==e||(t.removeTransition(n.id),a--)}t.removeState(e)},t.renameState=function(e,a){return t.existsStateWithName(a)?!1:(t.getStateById(e).name=a,t.statediagram.renameState(e,a),t.updateListener(),!0)},t.changeStartState=function(e){t.existsStateWithId(e)&&(t.statediagram.changeStartState(e),t.config.startState=e,t.updateListener())},t.removeStartState=function(){null!==t.config.startState&&(t.statediagram.removeStartState(),t.updateListener(),t.config.startState=null)},t.getFinalStateIndexByStateId=function(e){return _.indexOf(t.config.finalStates,e)},t.isStateAFinalState=function(e){for(var a=0;a<t.config.finalStates.length;a++)if(t.config.finalStates[a]==e)return!0;return!1},t.addFinalState=function(e){t.isStateAFinalState(e)||(t.config.finalStates.push(e),t.statediagram.addFinalState(e),t.updateListener())},t.removeFinalState=function(e){t.isStateAFinalState(e)&&(t.statediagram.removeFinalState(e),t.updateListener(),t.config.finalStates.splice(t.getFinalStateIndexByStateId(e),1))},t.existsTransition=function(e,a,n,i){for(var r=!1,s=0;s<t.config.transitions.length;s++){var o=t.config.transitions[s];o.fromState==e&&o.name==n&&o.id!==i&&(r=!0)}return r},t.getNextTransitionName=function(e){for(var a=[],n=0;n<t.config.transitions.length;n++)t.config.transitions[n].fromState==e&&a.push(t.config.transitions[n].name);for(var i=!1,r="a";!i;){var s=_.indexOf(a,r);-1===s?i=!0:r=String.fromCharCode(r.charCodeAt()+1)}return r},t.addTransition=function(e,a,n){return!t.existsTransition(e,a,n)&&t.existsStateWithId(e)&&t.existsStateWithId(a)?(t.addToAlphabet(n),t.addTransitionWithId(t.config.countTransitionId++,e,a,n)):void 0},t.addTransitionWithId=function(e,a,n,i){return t.config.transitions.push(new TransitionDFA(e,a,n,i)),t.statediagram.drawTransition(e),t.updateListener(),t.safeApply(),t.getTransitionById(e)},t.getArrayTransitionIdByTransitionId=function(e){return _.findIndex(t.config.transitions,function(t){return t.id==e?t:void 0})},t.getTransitionById=function(e){return t.config.transitions[t.getArrayTransitionIdByTransitionId(e)]},t.getTransition=function(e,a,n){for(var i=0;i<t.config.transitions.length;i++){var r=t.config.transitions[i];if(r.fromState==e&&r.toState==a&&r.name==n)return r}},t.removeTransition=function(e){t.removeFromAlphabetIfNotUsedFromOthers(e),t.statediagram.removeTransition(e),t.config.transitions.splice(t.getArrayTransitionIdByTransitionId(e),1),t.updateListener()},t.renameTransition=function(e,a){var n=t.getTransitionById(e);return t.existsTransition(n.fromState,n.toState,a)?!1:(t.getTransitionById(e),t.removeFromAlphabetIfNotUsedFromOthers(e),t.addToAlphabet(a),t.getTransitionById(e).name=a,t.statediagram.renameTransition(n.fromState,n.toState,e,a),t.updateListener(),!0)}}function DFA(t,e){"use strict";window.debugScope=t,t.defaultConfig={},t.defaultConfig.statePrefix="S",t.defaultConfig.transitionNameSuffix="|",t.defaultConfig.diagramm={x:0,y:0,scale:1,updatedWithZoomBehavior:!1},t.defaultConfig.countStateId=0,t.defaultConfig.countTransitionId=0,t.defaultConfig.states=[],t.defaultConfig.startState=null,t.defaultConfig.finalStates=[],t.defaultConfig.transitions=[],t.defaultConfig.alphabet=[],t.defaultConfig.inputWord="",t.defaultConfig.name="Untitled Automaton",t.defaultConfig.unSavedChanges=!1,t.defaultConfig.drawnTransitions=[],t.config=cloneObject(t.defaultConfig),t.updateListeners=[],t.simulator=new SimulationDFA(t),t.table=new TableDFA(t),t.statediagram=new StateDiagramDFA(t,"#diagramm-svg"),t.statetransitionfunction=new StatetransitionfunctionDFA(t),t.testData=new TestData(t),t.inNameEdit=!1,t.showModalWithMessage=function(e,a,n,i){t.title=e,t.description=a,t.modalAction=n,void 0===i?t.button="MODAL_BUTTON.PROCEED":t.button=i,$("#modal").modal()},t.executeModalAction=function(){t.$eval(t.modalAction)},t.stepTimeOutSlider={options:{floor:0,step:100,ceil:3e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.loopTimeOutSlider={options:{floor:0,step:100,ceil:4e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.keypressCallback=function(t){13==t.charCode&&document.getElementById("automatonNameEdit").blur()},window.onbeforeunload=function(e){if(t.config.unSavedChanges){var a="All Changes will be Lost. Save before continue!";return"undefined"==typeof e&&(e=window.event),e&&(e.returnValue=a),a}},t.saveAutomaton=function(){t.config.unSavedChanges=!1},t.safeApply=function(t){var e=this.$root.$$phase;"$apply"==e||"$digest"==e?t&&"function"==typeof t&&t():this.$apply(t)},t.resetAutomaton=function(){t.statediagram.clearSvgContent(),t.simulator.reset(),t.config=cloneObject(t.defaultConfig),t.safeApply(),t.updateListener()},t.addToAlphabet=function(e){_.some(t.config.alphabet,function(t){return t===e})||t.config.alphabet.push(e)},t.removeFromAlphabetIfNotUsedFromOthers=function(e){for(var a=t.getTransitionById(e),n=!1,i=0;i<t.config.transitions.length;i++)if(a.name===t.config.transitions[i].name&&t.config.transitions[i].id!==e)return void(n=!0);return n?!1:(_.pull(t.config.alphabet,a.name),!0)},t.updateListener=function(){_.forEach(t.updateListeners,function(t,e){t.updateFunction()}),t.config.unSavedChanges=!0},t.existsStateWithName=function(e,a){var n=!1;return _.forEach(t.config.states,function(t){return t.name==e&&t.id!==a?void(n=!0):void 0}),n},t.existsStateWithId=function(e){for(var a=0;a<t.config.states.length;a++)if(t.config.states[a].id==e)return!0;return!1},t.hasStateTransitions=function(e){var a=!1;return _.forEach(t.config.transitions,function(t){t.fromState!=e&&t.toState!=e||(a=!0)}),a},t.getArrayStateIdByStateId=function(e){return _.findIndex(t.config.states,function(t){return t.id==e?t:void 0})},t.getStateById=function(e){return t.config.states[t.getArrayStateIdByStateId(e)]},t.getStateByName=function(e){return t.config.states[t.getArrayStateIdByStateId(function(t){})]},t.addStateWithPresets=function(e,a){var n=t.addState(t.config.statePrefix+t.config.countStateId,e,a);return 1==t.config.countStateId&&t.changeStartState(0),n},t.addState=function(e,a,n){return t.existsStateWithName(e)?null:t.addStateWithId(t.config.countStateId++,e,a,n)},t.addStateWithId=function(e,a,n,i){return t.config.states.push(new State(e,a,n,i)),t.statediagram.drawState(e),t.updateListener(),t.safeApply(),t.getStateById(e)},t.removeState=function(e){t.hasStateTransitions(e)?t.showModalWithMessage("STATE_MENU.DELETE_MODAL_TITLE","STATE_MENU.DELETE_MODAL_DESC","forcedRemoveState("+e+")","MODAL_BUTTON.DELETE"):(t.isStateAFinalState(e)&&t.removeFinalState(e),t.config.startState==e&&(t.config.startState=null),t.statediagram.removeState(e),t.config.states.splice(t.getArrayStateIdByStateId(e),1),t.updateListener())},t.forcedRemoveState=function(e){for(var a=0;a<t.config.transitions.length;a++){var n=t.config.transitions[a];n.fromState!==e&&n.toState!==e||(t.removeTransition(n.id),a--)}t.removeState(e)},t.renameState=function(e,a){return t.existsStateWithName(a)?!1:(t.getStateById(e).name=a,t.statediagram.renameState(e,a),t.updateListener(),!0)},t.changeStartState=function(e){t.existsStateWithId(e)&&(t.statediagram.changeStartState(e),t.config.startState=e,t.updateListener())},t.removeStartState=function(){null!==t.config.startState&&(t.statediagram.removeStartState(),t.updateListener(),t.config.startState=null)},t.getFinalStateIndexByStateId=function(e){return _.indexOf(t.config.finalStates,e)},t.isStateAFinalState=function(e){for(var a=0;a<t.config.finalStates.length;a++)if(t.config.finalStates[a]==e)return!0;return!1},t.addFinalState=function(e){t.isStateAFinalState(e)||(t.config.finalStates.push(e),t.statediagram.addFinalState(e),t.updateListener())},t.removeFinalState=function(e){t.isStateAFinalState(e)&&(t.statediagram.removeFinalState(e),t.updateListener(),t.config.finalStates.splice(t.getFinalStateIndexByStateId(e),1))},t.existsTransition=function(e,a,n,i){for(var r=!1,s=0;s<t.config.transitions.length;s++){var o=t.config.transitions[s];o.fromState==e&&o.name==n&&o.id!==i&&(r=!0)}return r},t.getNextTransitionName=function(e){for(var a=[],n=0;n<t.config.transitions.length;n++)t.config.transitions[n].fromState==e&&a.push(t.config.transitions[n].name);for(var i=!1,r="a";!i;){var s=_.indexOf(a,r);-1===s?i=!0:r=String.fromCharCode(r.charCodeAt()+1)}return r},t.addTransition=function(e,a,n){return!t.existsTransition(e,a,n)&&t.existsStateWithId(e)&&t.existsStateWithId(a)?(t.addToAlphabet(n),t.addTransitionWithId(t.config.countTransitionId++,e,a,n)):void 0},t.addTransitionWithId=function(e,a,n,i){return t.config.transitions.push(new TransitionDFA(e,a,n,i)),t.statediagram.drawTransition(e),t.updateListener(),t.safeApply(),t.getTransitionById(e)},t.getArrayTransitionIdByTransitionId=function(e){return _.findIndex(t.config.transitions,function(t){return t.id==e?t:void 0})},t.getTransitionById=function(e){return t.config.transitions[t.getArrayTransitionIdByTransitionId(e)]},t.getTransition=function(e,a,n){for(var i=0;i<t.config.transitions.length;i++){var r=t.config.transitions[i];if(r.fromState==e&&r.toState==a&&r.name==n)return r}},t.removeTransition=function(e){t.removeFromAlphabetIfNotUsedFromOthers(e),t.statediagram.removeTransition(e),t.config.transitions.splice(t.getArrayTransitionIdByTransitionId(e),1),t.updateListener()},t.renameTransition=function(e,a){var n=t.getTransitionById(e);return t.existsTransition(n.fromState,n.toState,a)?!1:(t.getTransitionById(e),t.removeFromAlphabetIfNotUsedFromOthers(e),t.addToAlphabet(a),t.getTransitionById(e).name=a,t.statediagram.renameTransition(n.fromState,n.toState,e,a),t.updateListener(),!0)}}function SimulationDFA(t){"use strict";var e=this;e.isInPlay=!1,e.loopSimulation=!0,e.stepTimeOut=1500,e.loopTimeOut=2e3,e.simulationPaused=!1,e.simulationSettings=!0,e.currentState=null,e.nextState=null,e.transition=null,e.isInputAccepted=!1,e.settings=function(){e.simulationSettings=!e.simulationSettings},e.animated={currentState:null,transition:null,nextState:null},e.reset=function(){e.animated={currentState:null,transition:null,nextState:null},e.goneTransitions=[],e.currentState=t.config.startState,e.transition=null,e.animatedTransition=!1,e.nextState=null,e.animatedNextState=!1,e.isNextStepCalculated=!1,e.simulationStarted=!1,e.statusSequence=[t.config.startState],e.madeSteps=0,e.inputWord=t.config.inputWord,e.processedWord="",e.nextChar="",e.status="stopped"},e.pause=function(){e.simulationPaused||(e.simulationPaused=!0,e.isInPlay=!1)},e.stop=function(){e.pause(),e.reset()},e.play=function(){e.simulationPaused||(e.simulationStarted?((e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&(e.animateNextMove(),t.safeApply(function(){}),(e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&setTimeout(e.play,e.stepTimeOut)),e.isNextStepCalculated||"accepted"!=e.status||(e.loopSimulation?setTimeout(e.play,e.loopTimeOut):e.isInPlay=!1,e.simulationStarted=!1,t.safeApply(function(){}))):e.prepareSimulation())},e.prepareSimulation=function(){e.reset(),e.simulationStarted=!0,e.animated.currentState=_.last(e.statusSequence),t.safeApply(),setTimeout(e.play,e.loopTimeOut)},e.animateNextMove=function(){e.isNextStepCalculated||e.calcNextStep(),e.animatedTransition?!e.animatedNextState&&e.animatedTransition?(e.animatedNextState=!0,e.animated.nextState=e.nextState):e.animatedTransition&&e.animatedNextState&&(e.animated.transition=null,e.animated.nextState=null,e.animated.currentState=e.nextState,e.currentState=e.nextState,e.madeSteps++,e.inputWord.length==e.madeSteps&&(_.include(t.config.finalStates,e.currentState)?e.status="accepted":e.status="not accepted"),e.isNextStepCalculated=!1,e.animatedNextState=!1,e.animatedTransition=!1,e.processedWord+=e.nextChar,e.statusSequence.push(e.currentState),"accepted"!==e.status&&"not accepted"!==e.status&&e.calcNextStep()):(e.animatedTransition=!0,e.animated.transition=e.transition,e.goneTransitions.push(e.transition))},e.calcNextStep=function(){return e.isNextStepCalculated=!0,e.status="step",e.nextChar=e.inputWord[e.madeSteps],e.transition=_.filter(t.config.transitions,function(t){return void 0===e.nextChar?void(e.status="not accepted"):t.fromState==_.last(e.statusSequence)&&t.name==e.nextChar}),_.isEmpty(e.transition)?(e.transition=null,void(e.status="not accepted")):(e.transition=e.transition[0],void(e.nextState=e.transition.toState))},e.stepForward=function(){if(e.simulationPaused||e.pause(),e.simulationStarted){if(!_.include(["step","stopped","accepted","not accepted"],e.status))return void console.log(e.status);_.include(["accepted","not accepted"],e.status)||e.animateNextMove()}else e.prepareSimulation(),e.status="step"},e.stepBackward=function(){e.simulationPaused||e.pause(),_.include(["step","accepted","not accepted"],e.status)&&(e.status="step",e.animatedTransition||e.animatedNextState||0!==e.madeSteps?e.animateLastMove():e.reset())},e.animateLastMove=function(){console.log(e.animatedTransition+" "+e.animatedNextState),e.animatedTransition&&e.animatedNextState?(e.animated.nextState=null,e.animatedNextState=!1):e.animatedTransition?(e.animated.transition=null,e.animatedTransition=!1,e.goneTransitions.pop()):e.calcLastStep()},e.calcLastStep=function(){e.nextChar=e.processedWord.slice(-1),console.log(e.nextChar+" "+e.statusSequence[e.statusSequence.length-2]),e.transition=_.last(e.goneTransitions),console.log(e.transition),_.pullAt(e.goneTransitions,e.goneTransitions.length),e.animatedTransition=!0,e.animated.transition=e.transition;var t=e.currentState;e.currentState=e.transition.fromState,e.nextState=t,e.animated.nextState=e.nextState,e.animatedNextState=!0,e.animated.currentState=e.currentState,e.madeSteps--,e.statusSequence.splice(-1,1),e.processedWord=e.processedWord.slice(0,-1)},e.getNextTransition=function(e,a){for(var n=0;n<t.config.transitions.length;n++){var i=t.config.transitions[n];if(i.fromState==e&&i.name==a)return i}},e.check=function(){var a=!1,n=[];n.push(t.config.startState);for(var i="",r=0,s=null;r<=t.config.inputWord.length&&(i=t.config.inputWord[r],s=e.getNextTransition(_.last(n),i),!_.isEmpty(s));)if(n.push(s.toState),r++,t.config.inputWord.length==r){if(_.include(t.config.finalStates,_.last(n))){a=!0;break}break}return a},e.isPlayable=function(){return t.config.states.length>=1&&t.config.transitions.length>=1&&null!==t.config.startState&&t.config.finalStates.length>=1},e.playOrPause=function(){e.isPlayable()&&(e.isInPlay=!e.isInPlay,e.isInPlay?(e.simulationPaused=!1,e.play()):e.pause())},t.updateListeners.push(e),e.updateFunction=function(){e.isInputAccepted=e.check()}}function StateDiagramDFA(t,e){"use strict";function a(t,e){var a={x:t.y*e.z,y:-t.x*e.z};return a}function n(t){return t*(180/Math.PI)}function i(t){return t*(Math.PI/180)}function r(t,e){return{x:t.x*e,y:t.y*e}}function s(t){var e=1/Math.sqrt(t.x*t.x+t.y*t.y);return{x:t.x*e,y:t.y*e}}function o(t,e){var a=(t.x*e.x+t.y*e.y)/(Math.sqrt(t.x*t.x+t.y*t.y)*Math.sqrt(e.x*e.x+e.y*e.y)),i=Math.acos(a);return{val:a,rad:i,degree:n(i)}}function c(t,e){var a=t.x*e.x+t.y*e.y,n=t.x*e.y-t.y*e.x;return Math.atan2(n,a)}function d(t,e){var a=n(c(t,e));0>a&&(a+=360);var i=a+g;i>360&&(i-=360);var r=a-g;return 0>r&&(r+=360),{angle:a,lowerAngle:r,upperAngle:i}}var l=this;l.preventStateDragging=!1,l.inAddTransition=!1,l.selectedState=null,l.preventSvgOuterClick=!1,l.selectedTransition=null,l.showStateMenu=!1,l.showTransitionMenu=!1,l.selectedStateName="selectedForTransition",l.snapping=!0,l.settings={stateRadius:25,finalStateRadius:29,selected:!1};var u=40,f=18;l.stateSelfReferenceNumber=Math.sin(45*(Math.PI/180))*l.settings.stateRadius,l.existsDrawnTransition=function(e,a){for(var n=!1,i=0;i<t.config.drawnTransitions.length;i++){var r=t.config.drawnTransitions[i];r.fromState==e&&r.toState==a&&(n=!0)}return n},l.getDrawnTransition=function(e,a){for(var n=0;n<t.config.drawnTransitions.length;n++){var i=t.config.drawnTransitions[n];if(i.fromState==e&&i.toState==a)return i}},l.clearSvgContent=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgTransitions.html(""),l.svgStates.html(""),t.config.drawnTransitions=[],l.svg.attr("transform","translate("+t.defaultConfig.diagramm.x+","+t.defaultConfig.diagramm.y+") scale("+t.defaultConfig.diagramm.scale+")"),m.scale(t.defaultConfig.diagramm.scale),m.translate([t.defaultConfig.diagramm.x,t.defaultConfig.diagramm.y])},l.zoomMax=2.5,l.zoomMin=.5,l.zoomValue=.1,l.zoomIn=function(){t.config.diagramm.scale=t.config.diagramm.scale+l.zoomValue>l.zoomMax?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale+l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomOut=function(){t.config.diagramm.scale=t.config.diagramm.scale-l.zoomValue<=l.zoomMin?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale-l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomTo=function(e){console.log("zoomtedto"),t.config.diagramm.scale=e/100,t.safeApply(),l.updateZoomBehaviour()},l.updateZoomBehaviour=function(){t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")"),m.scale(t.config.diagramm.scale),m.translate([t.config.diagramm.x,t.config.diagramm.y])},l.zoomFitWindow=function(){var e,a=[],n=[],i=0,r=0,s=0,o=0,c=0,d=0,u=l.svgOuter.style("width").replace("px",""),f=l.svgOuter.style("height").replace("px","");if(t.config.diagramm.scale=1,t.config.states.length>0){for(e=0;e<t.config.states.length;e++)a[e]=t.config.states[e].x;for(e=0;e<t.config.states.length;e++)n[e]=t.config.states[e].y;for(i=_.min(a),r=_.max(a),s=_.min(n),o=_.max(n);r-i+150>u/t.config.diagramm.scale||o-s+200>f/t.config.diagramm.scale;)t.config.diagramm.scale-=.01;t.safeApply(),c=(f/t.config.diagramm.scale-(o-s))/2,d=(u/t.config.diagramm.scale-(r-i))/2,t.config.diagramm.x=-(i*t.config.diagramm.scale)+d*t.config.diagramm.scale,t.config.diagramm.y=-(s*t.config.diagramm.scale)+c*t.config.diagramm.scale,l.updateZoomBehaviour()}else l.scaleAndTranslateToDefault()},l.scaleAndTranslateToDefault=function(){t.config.diagramm.scale=t.defaultConfig.diagramm.scale,t.config.diagramm.x=t.defaultConfig.diagramm.x,t.config.diagramm.y=t.defaultConfig.diagramm.y,t.safeApply(),l.updateZoomBehaviour()};var m=d3.behavior.zoom().scaleExtent([l.zoomMin,l.zoomMax]).on("zoom",function(){var e=d3.event.button||d3.event.ctrlKey;if(e&&d3.event.stopImmediatePropagation(),3!==d3.event.sourceEvent.which){var a=Math.floor(100*d3.event.scale)/100;t.config.diagramm.scale=a,t.config.diagramm.x=d3.event.translate[0],t.config.diagramm.y=d3.event.translate[1],t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")")}else console.log("rightclick!")});l.svgOuter=d3.select(e).call(m).on("dblclick.zoom",null).on("contextmenu",function(){d3.event.preventDefault()}),l.addSvgOuterClickListener=function(){l.svgOuter.on("click",function(){l.preventSvgOuterClick?l.preventSvgOuterClick=!1:(l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply())})},l.addSvgOuterClickListener(),l.svgGrid=l.svgOuter.append("g").attr("id","grid"),l.svg=l.svgOuter.append("g").attr("id","svg-items"),l.svgTransitions=l.svg.append("g").attr("id","transitions"),l.svgStates=l.svg.append("g").attr("id","states"),l.gridSpace=100,l.gridSnapDistance=20,l.isGrid=!0,t.$watch("[statediagram.isGrid , config.diagramm]",function(){l.drawGrid()},!0),l.drawGrid=function(){if(l.isGrid){l.svgGrid.html("");var e,a=l.svgOuter.style("width").replace("px",""),n=l.svgOuter.style("height").replace("px",""),i=1*t.config.diagramm.scale*.5,r=t.config.diagramm.x%(l.gridSpace*t.config.diagramm.scale),s=t.config.diagramm.y%(l.gridSpace*t.config.diagramm.scale);for(e=r;a>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line xgrid-line").attr("x1",e).attr("y1",0).attr("x2",e).attr("y2",n);for(e=s;n>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line ygrid-line").attr("x1",0).attr("y1",e).attr("x2",a).attr("y2",e)}else l.svgGrid.html("")},l.defs=l.svg.append("svg:defs"),l.defs.append("svg:marker").attr("id","marker-end-arrow").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-create").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-animated").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-hover").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-selection").attr("refX",4).attr("refY",3).attr("markerWidth",5).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.resetAddActions=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgOuter.on("click",null),l.inAddTransition=!1,l.inAddState=!1},l.addState=function(){l.resetAddActions(),l.svgOuter.on("mousemove",function(){l.selectedState.objReference.attr("transform","translate("+(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale)+" "+(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale)+")")}),l.selectedState=t.addStateWithPresets(-1e4,-1e4),l.selectedState.objReference.classed("state-in-creation",!0),l.svgOuter.on("click",function(){l.selectedState.objReference.classed("state-in-creation",!1),l.selectedState.x=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),l.selectedState.y=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),l.selectedState.objReference.attr("transform","translate("+l.selectedState.x+" "+l.selectedState.y+")"),l.svgOuter.on("mousemove",null),l.addSvgOuterClickListener(),l.preventSvgOuterClick=!1,t.safeApply()})},l.addTransition=function(){l.resetAddActions(),l.preventStateDragging=!0,d3.selectAll(".state").on("click",function(){if(l.mouseInState=!0,null===l.selectedState)l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.tmpTransition=l.svgTransitions.append("g").attr("class","transition"),l.tmpTransitionline=l.tmpTransition.append("path").attr("class","transition-line curvedLine in-creation").attr("marker-end","url(#marker-end-arrow-create)").attr("fill","none");else{var e=t.addTransition(l.selectedState.id,parseInt(d3.select(this).attr("object-id")),t.getNextTransitionName(l.selectedState.id));l.toggleState(l.selectedState.id,!1),l.tmpTransition.remove(),l.tmpTransition=null,l.tmpTransitionline=null,l.preventStateDragging=!1,l.addSvgOuterClickListener(),l.svgOuter.on("mousemove",null),d3.selectAll(".state").on("mouseover",null),d3.selectAll(".state").on("mouseleave",null),d3.selectAll(".state").on("click",l.openStateMenu),l.openTransitionMenu(e.id)}}),l.svgOuter.on("mousemove",function(){if(!l.mouseInState&&null!==l.selectedState){var e=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),a=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),n=l.bezierLine([[l.selectedState.x,l.selectedState.y],[e,a]]);l.tmpTransitionline.attr("d",n)}}),d3.selectAll(".state").on("mouseover",function(e){if(l.mouseInState=!0,null!==l.selectedState){var a=t.getStateById(d3.select(this).attr("object-id")),n={};n.fromState=l.selectedState.id,n.toState=a.id;var i=l.tmpTransitionline;if(l.existsDrawnTransition(l.selectedState.fromState,l.selectedState.toState)){var r=l.getDrawnTransition(n.fromState,n.toState);r.names.push(n.name),l.writeTransitionText(r.objReference.select(".transition-text"),r.names)}else if(n.fromState!=n.toState){var s=l.getTransitionDrawConfig(n);if(s.approachTransition){var o=l.getDrawnTransition(n.toState,n.fromState),c=l.getTransitionDrawConfig(o,!0);l.updateTransitionLines(o.objReference,c.path),o.objReference.select(".transition-text").attr("x",c.xText).attr("y",c.yText),l.otherTransition=o}i.attr("d",s.path)}else{var d=t.getArrayStateIdByStateId(n.fromState),u=t.config.states[d].x,f=t.config.states[d].y;i.attr("d",l.selfTransition(u,f))}l.tmpTransitionline.attr("x1",l.selectedState.x).attr("y1",l.selectedState.y).attr("x2",a.x).attr("y2",a.y)}}).on("mouseleave",function(){if(l.mouseInState=!1,null!==l.otherTransition&&void 0!==l.otherTransition){var t=l.getTransitionDrawConfig(l.otherTransition);l.updateTransitionLines(l.otherTransition.objReference,t.path),l.otherTransition.objReference.select(".transition-text").attr("x",t.xText).attr("y",t.yText)}})},l.renameState=function(e,a){var n=t.config.states[t.getArrayStateIdByStateId(e)],i=n.objReference;i.select("text").text(a)},l.removeState=function(e){l.closeStateMenu();var a=t.config.states[t.getArrayStateIdByStateId(e)],n=a.objReference;n.remove()},l.renameTransition=function(t,e,a,n){var i=l.getDrawnTransition(t,e),r=_.find(i.names,{id:a});r.name=n,l.writeTransitionText(i.objReference.select(".transition-text"),i.names)},l.removeTransition=function(e){var a=t.getTransitionById(e),n=l.getDrawnTransition(a.fromState,a.toState),i=l.getTransitionDrawConfig(a);if(l.closeTransitionMenu(),1===n.names.length){if(n.objReference.remove(),_.remove(t.config.drawnTransitions,function(t){return t==n}),i.approachTransition){var r=l.getDrawnTransition(a.toState,a.fromState),s=l.getTransitionDrawConfig(r,!1);l.updateTransitionLines(r.objReference,s.path),r.objReference.select(".transition-text").attr("x",s.xText).attr("y",s.yText),l.otherTransition=r}}else _.remove(n.names,function(t){return t.id==a.id}),l.writeTransitionText(n.objReference.select(".transition-text"),n.names),i=l.getTransitionDrawConfig(a),n.objReference.select(".transition-text").attr("x",i.xText).attr("y",i.yText),console.log(n),l.openTransitionMenu(n.names[n.names.length-1].id)},l.addFinalState=function(e){var a=t.getStateById(e);a.objReference.insert("circle",".state-circle").attr("class","final-state").attr("r",l.settings.finalStateRadius)},l.removeFinalState=function(e){var a=t.getStateById(e);a.objReference.select(".final-state").remove()},l.changeStartState=function(e){if(null!==t.config.startState){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove()}var n=t.getStateById(e);n.objReference.append("line").attr("class","transition-line start-line").attr("x1",0).attr("y1",-75).attr("x2",0).attr("y2",0-l.settings.stateRadius-4).attr("marker-end","url(#marker-end-arrow)")},l.removeStartState=function(e){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove(),t.config.startState=null,
t.updateListener()},l.drawState=function(e){var a=t.getStateById(e),n=l.svgStates.append("g").attr("transform","translate("+a.x+" "+a.y+")").attr("class","state state-"+a.id).attr("object-id",a.id);return n.append("circle").attr("class","state-circle").attr("r",l.settings.stateRadius),n.append("circle").attr("class","state-circle hover-circle").attr("r",l.settings.stateRadius),n.append("text").text(a.name).attr("class","state-text").attr("dominant-baseline","central").attr("text-anchor","middle"),a.objReference=n,n.on("click",l.openStateMenu).call(l.dragState),n},l.setStateClassAs=function(e,a,n){var i=t.getStateById(e).objReference;i.classed(n,a)},l.setTransitionClassAs=function(e,a,n){var i=t.getTransitionById(e),r=l.getDrawnTransition(i.fromState,i.toState).objReference;r.classed(n,a),a&&"animated-transition"==n?r.select(".transition-line").attr("marker-end","url(#marker-end-arrow-animated)"):r.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.setArrowMarkerTo=function(t,e){""!==e?t.select(".transition-line").attr("marker-end","url(#marker-end-arrow-"+e+")"):t.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.openStateMenu=function(){console.log("open state menu"),l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply(),l.preventSvgOuterClick=!0,l.showStateMenu=!0,l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.input={},l.input.state=l.selectedState,l.input.stateName=l.selectedState.name,l.input.startState=t.config.startState==l.selectedState.id,l.input.finalState=t.isStateAFinalState(l.selectedState.id),l.input.ttt="",l.input.tttisopen=!1,t.safeApply(),l.stateMenuListener=[],l.stateMenuListener.push(t.$watch("statediagram.input.startState",function(e,a){e!==a&&(l.input.startState?t.changeStartState(l.input.state.id):l.selectedState.id==t.config.startState&&t.removeStartState())})),l.stateMenuListener.push(t.$watch("statediagram.input.finalState",function(e,a){e!==a&&(l.input.finalState?t.addFinalState(l.input.state.id):t.removeFinalState(l.input.state.id))})),l.stateMenuListener.push(t.$watch("statediagram.input.stateName",function(e,a){l.input.tttisopen=!1,e!==a&&(""===e||t.existsStateWithName(e)?""===e?(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_TOO_SHORT"):t.existsStateWithName(e,l.input.state.id)&&(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_ALREADY_EXIST"):!t.renameState(l.input.state.id,e))}))},l.closeStateMenu=function(){_.forEach(l.stateMenuListener,function(t,e){t()}),null!==l.selectedState&&l.toggleState(l.selectedState.id,!1),l.stateMenuListener=null,l.showStateMenu=!1,l.input=null},l.toggleState=function(t,e){l.setStateClassAs(t,e,"active"),e===!1&&(l.selectedState=null)},l.dragState=d3.behavior.drag().on("dragstart",function(){l.dragAmount=0,d3.event.sourceEvent.stopPropagation()}).on("drag",function(){if(1==d3.event.sourceEvent.which&&!l.preventStateDragging){l.dragAmount++;var e=d3.event.x,a=d3.event.y;if(l.snapping){var n=e-e%l.gridSpace,i=a-a%l.gridSpace;e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n,a=i):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n+l.gridSpace,a=i):e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance?(e=n,a=i+l.gridSpace):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance&&(e=n+l.gridSpace,a=i+l.gridSpace)}if(l.dragAmount>1){d3.select(this).attr("transform","translate("+e+" "+a+")");var r=d3.select(this).attr("object-id"),s=t.getStateById(r);s.x=e,s.y=a,l.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"))}}}).on("dragend",function(){l.dragAmount>1&&t.safeApply()}),l.selfTransition=function(t,e){return l.bezierLine([[t-l.stateSelfReferenceNumber,e-l.stateSelfReferenceNumber],[t-l.stateSelfReferenceNumber-u,e-l.stateSelfReferenceNumber-f],[t-l.stateSelfReferenceNumber-u,e+l.stateSelfReferenceNumber+f],[t-l.stateSelfReferenceNumber,e+l.stateSelfReferenceNumber]])};var g=30;l.bezierLine=d3.svg.line().x(function(t){return t[0]}).y(function(t){return t[1]}).interpolate("basis"),l.getTransitionDrawConfig=function(e,n){var c=3,u={};u.approachTransition=n||l.existsDrawnTransition(e.toState,e.fromState);var f,m=t.getStateById(e.fromState),g=t.getStateById(e.toState),S=t.isStateAFinalState(e.toState),p=m.x,v=m.y,h=g.x,T=g.y,x={x:h-p,y:T-v},y=Math.sqrt(x.x*x.x+x.y*x.y),A=l.settings.stateRadius/y;f=S?(l.settings.stateRadius+c+5)/y:(l.settings.stateRadius+c)/y,u.xStart=p+A*x.x,u.yStart=v+A*x.y,u.xEnd=h-f*x.x,u.yEnd=T-f*x.y,u.xDiff=h-p,u.yDiff=T-v,u.xMid=(p+h)/2,u.yMid=(v+T)/2,u.distance=Math.sqrt(u.xDiff*u.xDiff+u.yDiff*u.yDiff);var w,I,M={x:u.xMid-u.xStart,y:u.yMid-u.yStart,z:0},D={x:0,y:0,z:1},b={x:1,y:0,z:0};if(w=20,I=a(M,D),I=s(I),I=r(I,w),u.approachTransition){var C=d({x:u.xStart-p,y:u.yStart-v},{x:l.settings.stateRadius,y:0}),L=d({x:u.xEnd-h,y:u.yEnd-T},{x:l.settings.stateRadius,y:0});u.xStart=p+l.settings.stateRadius*Math.cos(i(C.upperAngle)),u.yStart=v-l.settings.stateRadius*Math.sin(i(C.upperAngle)),u.xEnd=h+l.settings.stateRadius*Math.cos(i(L.lowerAngle)),u.yEnd=T-l.settings.stateRadius*Math.sin(i(L.lowerAngle))}w=35,I=a(M,D),I=s(I),I=r(I,w),u.xMidCurv=I.x+u.xMid,u.yMidCurv=I.y+u.yMid;var k,R=(l.existsDrawnTransition(m.id,g.id),l.getDrawnTransition(m.id,g.id));k=R?R.names.length:1;var E,N,_=o(M,b),B=_.degree;B>90&&(B=90-B%90);var O=Math.pow(B/90,.5);E=u.approachTransition?40+8*k*O:12+8*k*O,N=a(M,D),N=s(N),N=r(N,E),u.xText=N.x+u.xMid,u.yText=N.y+u.yMid;var F=[];return F=u.approachTransition?[[u.xStart,u.yStart],[u.xMidCurv,u.yMidCurv],[u.xEnd,u.yEnd]]:[[u.xStart,u.yStart],[u.xEnd,u.yEnd]],u.path=l.bezierLine(F),u},l.writeTransitionText=function(e,a){e.selectAll("*").remove();for(var n=0;n<a.length;n++)null!==t.simulator.animated.transition&&a[n].id===t.simulator.animated.transition.id?e.append("tspan").attr("transition-id",a[n].id).text(a[n].name).classed("animated-transition-text",!0):e.append("tspan").attr("transition-id",a[n].id).text(a[n].name),n<a.length-1&&e.append("tspan").text(" | ")},l.drawTransition=function(e){var a=t.getTransitionById(e);if(!l.existsDrawnTransition(a.fromState,a.toState)){var n=l.svgTransitions.append("g").attr("class","transition"),i=(n.append("path").attr("class","transition-line-selection").attr("fill","none").attr("marker-end","url(#marker-end-arrow-selection)"),n.append("path").attr("class","transition-line").attr("fill","none").attr("marker-end","url(#marker-end-arrow)"),n.append("path").attr("class","transition-line-click").attr("stroke-width",20).attr("stroke","transparent").attr("fill","none"),n.append("path").attr("class","transition-line-hover").attr("fill","none").attr("marker-end","url(#marker-end-arrow-hover)"),n.append("text").attr("class","transition-text").attr("dominant-baseline","central").attr("fill","black"));if(a.fromState!=a.toState){var r=l.getTransitionDrawConfig(a);if(r.approachTransition){var s=l.getDrawnTransition(a.toState,a.fromState),o=l.getTransitionDrawConfig(s,!0);l.updateTransitionLines(s.objReference,o.path),s.objReference.select(".transition-text").attr("x",o.xText).attr("y",o.yText)}i.attr("class","transition-text").attr("x",r.xText).attr("y",r.yText),l.updateTransitionLines(n,r.path)}else{var c=t.getArrayStateIdByStateId(a.fromState),d=t.config.states[c].x,u=t.config.states[c].y;l.updateTransitionLines(n,l.selfTransition(d,u)),i.attr("x",d-l.settings.stateRadius-50).attr("y",u)}return n.attr("object-id",t.config.drawnTransitions.push({fromState:a.fromState,toState:a.toState,names:[{id:a.id,name:a.name}],objReference:n})-1),l.writeTransitionText(i,l.getDrawnTransition(a.fromState,a.toState).names),n.attr("from-state-id",a.fromState).attr("to-state-id",a.toState).on("click",l.openTransitionMenu).on("mouseover",function(){d3.select(this).select(".transition-line-hover").attr("style","opacity:0.6")}).on("mouseleave",function(){d3.select(this).select(".transition-line-hover").attr("style","")}),n}var f=l.getDrawnTransition(a.fromState,a.toState);f.names.push({id:a.id,name:a.name}),l.writeTransitionText(f.objReference.select(".transition-text"),l.getDrawnTransition(a.fromState,a.toState).names);var m=l.getTransitionDrawConfig(a);f.objReference.select(".transition-text").attr("x",m.xText).attr("y",m.yText)},l.updateTransitionLines=function(t,e){t.select(".transition-line").attr("d",e),t.select(".transition-line-selection").attr("d",e),t.select(".transition-line-hover").attr("d",e),t.select(".transition-line-click").attr("d",e)},l.openTransitionMenu=function(e){l.closeStateMenu(),l.closeTransitionMenu(),l.preventSvgOuterClick=!0,l.showTransitionMenu=!0;var a,n;if(void 0===e)a=d3.select(this).attr("from-state-id"),n=d3.select(this).attr("to-state-id"),l.selectedTransition=l.getDrawnTransition(a,n);else{var i=t.getTransitionById(e);a=i.fromState,n=i.toState,l.selectedTransition=l.getDrawnTransition(a,n)}l.selectedTransition.objReference.classed("active",!0),l.input={},l.input.fromState=t.getStateById(a),l.input.toState=t.getStateById(n),l.input.transitions=[],_.forEach(l.selectedTransition.names,function(t,a){var n={};n=cloneObject(t),void 0!==e?t.id==e&&(n.isFocus=!0):l.selectedTransition.names.length-1===a&&(n.isFocus=!0),n.ttt="",n.tttisopen=!1,l.input.transitions.push(n)}),l.transitionMenuListener=[];for(var r=0;r<l.input.transitions.length;r++)l.transitionMenuListener.push(t.$watchCollection("statediagram.input.transitions['"+r+"']",function(e,i){e.name!==i.name&&(e.tttisopen=!1,""===e.name||t.existsTransition(a,n,e.name)?""===e.name?(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_TOO_SHORT"):t.existsTransition(a,n,e.name,e.id)&&(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_ALREAD_EXISTS"):t.renameTransition(e.id,e.name),console.log(t.existsTransition(a,n,e.name,e.id)))}));t.safeApply()},l.closeTransitionMenu=function(){_.forEach(l.transitionMenuListener,function(t,e){t()}),l.showTransitionMenu=!1,null!==l.selectedTransition&&(l.selectedTransition.objReference.classed("active",!1),l.selectedTransition=null)},l.updateTransitionsAfterStateDrag=function(e){t.config.states[t.getArrayStateIdByStateId(e)].name,_.forEach(t.config.drawnTransitions,function(a,n){if(a.fromState==e||a.toState==e){var i=a.objReference,r=i.select("text");if(a.fromState!=a.toState){var s=l.getTransitionDrawConfig(a);l.updateTransitionLines(i,s.path),r.attr("x",s.xText).attr("y",s.yText)}else{var o=a.fromState,c=t.config.states[t.getArrayStateIdByStateId(o)].x,d=t.config.states[t.getArrayStateIdByStateId(o)].y;l.updateTransitionLines(i,l.selfTransition(c,d)),r.attr("x",c-l.settings.stateRadius-50).attr("y",d)}}})},t.$watch("simulator.animated.currentState",function(e,a){e!==a&&(console.log("CURRENTSTATE:oldValue "+a+" newvalue "+e),console.log("status"+t.simulator.status),null!==a&&(l.setStateClassAs(a,!1,"animated-currentstate-svg"),l.setStateClassAs(a,!1,"animated-accepted-svg"),l.setStateClassAs(a,!1,"animated-not-accepted-svg")),null!==e&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"):l.setStateClassAs(e,!0,"animated-currentstate-svg")))}),t.$watch("simulator.animated.transition",function(t,e){t!==e&&(null!==e&&(l.setTransitionClassAs(e.id,!1,"animated-transition"),d3.selectAll("[transition-id='"+e.id+"'").classed("animated-transition-text",!1)),null!==t&&(l.setTransitionClassAs(t.id,!0,"animated-transition"),console.log(t),d3.selectAll("[transition-id='"+t.id+"'").classed("animated-transition-text",!0)))}),t.$watch("simulator.animated.nextState",function(t,e){t!==e&&(console.log("NEXTSTATE: oldValue "+e+" newvalue "+t),null!==e&&l.setStateClassAs(e,!1,"animated-nextstate-svg"),null!==t&&l.setStateClassAs(t,!0,"animated-nextstate-svg"))}),t.$watch("simulator.status",function(e,a){e!==a&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status&&l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"))})}function StatetransitionfunctionDFA(t){"use strict";var e=this;e.functionData={},e.functionData.states=[],e.functionData.startState="",e.functionData.finalStates="",e.functionData.transitions="",e.functionData.statetransitionfunction=[],t.updateListeners.push(e),e.updateFunction=function(){var a,n="",i="",r="",s="";e.functionData.transitions=t.config.alphabet,e.functionData.states=[],_.forEach(t.config.states,function(a,i){n="";var r="";null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id&&(r="selected"),n+=a.id==t.simulator.animated.currentState&&"accepted"===t.simulator.status?'<span class="animated-accepted '+r+'">':a.id==t.simulator.animated.currentState&&"not accepted"===t.simulator.status?'<span class="animated-not-accepted '+r+'">':a.id==t.simulator.animated.currentState?'<span class="animated-currentstate '+r+'">':'<span class="'+r+'">',n+=a.name,n+="</span>",i<t.config.states.length-1&&(n+=", "),e.functionData.states.push(n)}),e.functionData.statetransitionfunction=[],_.forEach(t.config.states,function(a,n){_.forEach(t.config.transitions,function(n,r){if(n.fromState===a.id){var s=n,o=!1;null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{id:n.id})&&(o=!0);var c=!1;t.simulator.animated.transition&&t.simulator.animated.transition.id===s.id&&(c=!0),i=c||o?'(<span class=" '+(c?"animated-transition":"")+" "+(o?"selected":"")+'">':"(<span>",i+=t.getStateById(s.fromState).name+", ",i+=s.name+", ",i+=t.getStateById(s.toState).name+"</span>)",e.functionData.statetransitionfunction.push(i)}})}),a=t.getStateById(t.config.startState),void 0!==a&&(r+='<span class="">'+a.name+"</span>"),e.functionData.startState=r,_.forEach(t.config.finalStates,function(e,a){e=t.getStateById(e),s=e.name,a<t.config.finalStates.length-1&&(s+=", ")}),e.functionData.finalStates=s},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.status",function(t,a){t!==a&&e.updateFunction()})}function TableDFA(t){var e=this;e.states=[],t.updateListeners.push(e),e.updateFunction=function(){e.states=[],e.alphabet=[],t.config,_.forEach(t.config.alphabet,function(a,n){var i="";null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{name:a})&&(i="selected");var r;r=t.simulator.animated.transition&&t.simulator.animated.transition.name===a?'<span class="animated-transition '+i+'">'+a+"</span>":'<span class="'+i+'">'+a+"</span>",e.alphabet.push(r)}),_.forEach(t.config.states,function(a,n){var i={};i.id=a.id;var r="";if((null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id||null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.fromState===a.id)&&(r="selected"),t.simulator.animated.currentState==a.id){var s="";s="accepted"===t.simulator.status?"animated-accepted":"not accepted"===t.simulator.status?"animated-not-accepted":"animated-currentstate",i.name='<span class="'+s+" "+r+'">'+a.name+"</span>"}else i.name='<span class="'+r+'">'+a.name+"</span>";t.isStateAFinalState(a.id)?i.finalState=!0:i.finalState=!1,t.config.startState===a.id?i.startState=!0:i.startState=!1,i.trans=[],_.forEach(t.config.alphabet,function(e,n){var r=null;_.forEach(t.config.transitions,function(t,n){t.fromState===a.id&&t.name===e&&(r=t)});var s={};if(s.alphabet=e,null!==r){var o=t.getStateById(r.toState),c="";null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.toState===o.id&&(c="selected"),t.simulator.animated.nextState==o.id&&r.name==t.simulator.animated.transition.name?s.State='<span class="animated-nextstate '+c+'">'+o.name+"</span>":s.State='<span class="'+c+'">'+o.name+"</span>"}else s.State="";i.trans.push(s)}),e.states.push(i)})},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.nextState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()})}function DFA(t,e){"use strict";window.debugScope=t,t.defaultConfig={},t.defaultConfig.statePrefix="S",t.defaultConfig.transitionNameSuffix="|",t.defaultConfig.diagramm={x:0,y:0,scale:1,updatedWithZoomBehavior:!1},t.defaultConfig.countStateId=0,t.defaultConfig.countTransitionId=0,t.defaultConfig.states=[],t.defaultConfig.startState=null,t.defaultConfig.finalStates=[],t.defaultConfig.transitions=[],t.defaultConfig.alphabet=[],t.defaultConfig.inputWord="",t.defaultConfig.name="Untitled Automaton",t.defaultConfig.unSavedChanges=!1,t.defaultConfig.drawnTransitions=[],t.config=cloneObject(t.defaultConfig),t.updateListeners=[],t.simulator=new SimulationDFA(t),t.table=new TableDFA(t),t.statediagram=new StateDiagramDFA(t,"#diagramm-svg"),t.statetransitionfunction=new StatetransitionfunctionDFA(t),t.testData=new TestData(t),t.inNameEdit=!1,t.showModalWithMessage=function(e,a,n,i){t.title=e,t.description=a,t.modalAction=n,void 0===i?t.button="MODAL_BUTTON.PROCEED":t.button=i,$("#modal").modal()},t.executeModalAction=function(){t.$eval(t.modalAction)},t.stepTimeOutSlider={options:{floor:0,step:100,ceil:3e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.loopTimeOutSlider={options:{floor:0,step:100,ceil:4e3,hideLimitLabels:!0,translate:function(t){return t+" ms"}}},t.keypressCallback=function(t){13==t.charCode&&document.getElementById("automatonNameEdit").blur()},window.onbeforeunload=function(e){if(t.config.unSavedChanges){var a="All Changes will be Lost. Save before continue!";return"undefined"==typeof e&&(e=window.event),e&&(e.returnValue=a),a}},t.saveAutomaton=function(){t.config.unSavedChanges=!1},t.safeApply=function(t){var e=this.$root.$$phase;"$apply"==e||"$digest"==e?t&&"function"==typeof t&&t():this.$apply(t)},t.resetAutomaton=function(){t.statediagram.clearSvgContent(),t.simulator.reset(),t.config=cloneObject(t.defaultConfig),t.safeApply(),t.updateListener()},t.addToAlphabet=function(e){_.some(t.config.alphabet,function(t){return t===e})||t.config.alphabet.push(e)},t.removeFromAlphabetIfNotUsedFromOthers=function(e){for(var a=t.getTransitionById(e),n=!1,i=0;i<t.config.transitions.length;i++)if(a.name===t.config.transitions[i].name&&t.config.transitions[i].id!==e)return void(n=!0);return n?!1:(_.pull(t.config.alphabet,a.name),!0)},t.updateListener=function(){_.forEach(t.updateListeners,function(t,e){t.updateFunction()}),t.config.unSavedChanges=!0},t.existsStateWithName=function(e,a){var n=!1;return _.forEach(t.config.states,function(t){return t.name==e&&t.id!==a?void(n=!0):void 0}),n},t.existsStateWithId=function(e){for(var a=0;a<t.config.states.length;a++)if(t.config.states[a].id==e)return!0;return!1},t.hasStateTransitions=function(e){var a=!1;return _.forEach(t.config.transitions,function(t){t.fromState!=e&&t.toState!=e||(a=!0)}),a},t.getArrayStateIdByStateId=function(e){return _.findIndex(t.config.states,function(t){return t.id==e?t:void 0})},t.getStateById=function(e){return t.config.states[t.getArrayStateIdByStateId(e)]},t.getStateByName=function(e){return t.config.states[t.getArrayStateIdByStateId(function(t){})]},t.addStateWithPresets=function(e,a){var n=t.addState(t.config.statePrefix+t.config.countStateId,e,a);return 1==t.config.countStateId&&t.changeStartState(0),n},t.addState=function(e,a,n){return t.existsStateWithName(e)?null:t.addStateWithId(t.config.countStateId++,e,a,n)},t.addStateWithId=function(e,a,n,i){return t.config.states.push(new State(e,a,n,i)),t.statediagram.drawState(e),t.updateListener(),t.safeApply(),t.getStateById(e)},t.removeState=function(e){t.hasStateTransitions(e)?t.showModalWithMessage("STATE_MENU.DELETE_MODAL_TITLE","STATE_MENU.DELETE_MODAL_DESC","forcedRemoveState("+e+")","MODAL_BUTTON.DELETE"):(t.isStateAFinalState(e)&&t.removeFinalState(e),t.config.startState==e&&(t.config.startState=null),t.statediagram.removeState(e),t.config.states.splice(t.getArrayStateIdByStateId(e),1),t.updateListener())},t.forcedRemoveState=function(e){for(var a=0;a<t.config.transitions.length;a++){var n=t.config.transitions[a];n.fromState!==e&&n.toState!==e||(t.removeTransition(n.id),a--)}t.removeState(e)},t.renameState=function(e,a){return t.existsStateWithName(a)?!1:(t.getStateById(e).name=a,t.statediagram.renameState(e,a),t.updateListener(),!0)},t.changeStartState=function(e){t.existsStateWithId(e)&&(t.statediagram.changeStartState(e),t.config.startState=e,t.updateListener())},t.removeStartState=function(){null!==t.config.startState&&(t.statediagram.removeStartState(),t.updateListener(),t.config.startState=null)},t.getFinalStateIndexByStateId=function(e){return _.indexOf(t.config.finalStates,e)},t.isStateAFinalState=function(e){for(var a=0;a<t.config.finalStates.length;a++)if(t.config.finalStates[a]==e)return!0;return!1},t.addFinalState=function(e){t.isStateAFinalState(e)||(t.config.finalStates.push(e),t.statediagram.addFinalState(e),t.updateListener())},t.removeFinalState=function(e){t.isStateAFinalState(e)&&(t.statediagram.removeFinalState(e),t.updateListener(),t.config.finalStates.splice(t.getFinalStateIndexByStateId(e),1))},t.existsTransition=function(e,a,n,i){for(var r=!1,s=0;s<t.config.transitions.length;s++){var o=t.config.transitions[s];o.fromState==e&&o.name==n&&o.id!==i&&(r=!0)}return r},t.getNextTransitionName=function(e){for(var a=[],n=0;n<t.config.transitions.length;n++)t.config.transitions[n].fromState==e&&a.push(t.config.transitions[n].name);for(var i=!1,r="a";!i;){var s=_.indexOf(a,r);-1===s?i=!0:r=String.fromCharCode(r.charCodeAt()+1)}return r},t.addTransition=function(e,a,n){return!t.existsTransition(e,a,n)&&t.existsStateWithId(e)&&t.existsStateWithId(a)?(t.addToAlphabet(n),t.addTransitionWithId(t.config.countTransitionId++,e,a,n)):void 0},t.addTransitionWithId=function(e,a,n,i){return t.config.transitions.push(new TransitionDFA(e,a,n,i)),t.statediagram.drawTransition(e),t.updateListener(),t.safeApply(),t.getTransitionById(e)},t.getArrayTransitionIdByTransitionId=function(e){return _.findIndex(t.config.transitions,function(t){return t.id==e?t:void 0})},t.getTransitionById=function(e){return t.config.transitions[t.getArrayTransitionIdByTransitionId(e)]},t.getTransition=function(e,a,n){for(var i=0;i<t.config.transitions.length;i++){var r=t.config.transitions[i];if(r.fromState==e&&r.toState==a&&r.name==n)return r}},t.removeTransition=function(e){t.removeFromAlphabetIfNotUsedFromOthers(e),t.statediagram.removeTransition(e),t.config.transitions.splice(t.getArrayTransitionIdByTransitionId(e),1),t.updateListener()},t.renameTransition=function(e,a){var n=t.getTransitionById(e);return t.existsTransition(n.fromState,n.toState,a)?!1:(t.getTransitionById(e),t.removeFromAlphabetIfNotUsedFromOthers(e),t.addToAlphabet(a),t.getTransitionById(e).name=a,t.statediagram.renameTransition(n.fromState,n.toState,e,a),t.updateListener(),!0)}}function SimulationDFA(t){"use strict";var e=this;e.isInPlay=!1,e.loopSimulation=!0,e.stepTimeOut=1500,e.loopTimeOut=2e3,e.simulationPaused=!1,e.simulationSettings=!0,e.currentState=null,e.nextState=null,e.transition=null,e.isInputAccepted=!1,e.settings=function(){e.simulationSettings=!e.simulationSettings},e.animated={currentState:null,transition:null,nextState:null},e.reset=function(){e.animated={currentState:null,transition:null,nextState:null},e.goneTransitions=[],e.currentState=t.config.startState,e.transition=null,e.animatedTransition=!1,e.nextState=null,e.animatedNextState=!1,e.isNextStepCalculated=!1,e.simulationStarted=!1,e.statusSequence=[t.config.startState],e.madeSteps=0,e.inputWord=t.config.inputWord,e.processedWord="",e.nextChar="",e.status="stopped"},e.pause=function(){e.simulationPaused||(e.simulationPaused=!0,e.isInPlay=!1)},e.stop=function(){e.pause(),e.reset()},e.play=function(){e.simulationPaused||(e.simulationStarted?((e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&(e.animateNextMove(),t.safeApply(function(){}),(e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&setTimeout(e.play,e.stepTimeOut)),e.isNextStepCalculated||"accepted"!=e.status||(e.loopSimulation?setTimeout(e.play,e.loopTimeOut):e.isInPlay=!1,e.simulationStarted=!1,t.safeApply(function(){}))):e.prepareSimulation())},e.prepareSimulation=function(){e.reset(),e.simulationStarted=!0,e.animated.currentState=_.last(e.statusSequence),t.safeApply(),setTimeout(e.play,e.loopTimeOut)},e.animateNextMove=function(){e.isNextStepCalculated||e.calcNextStep(),e.animatedTransition?!e.animatedNextState&&e.animatedTransition?(e.animatedNextState=!0,e.animated.nextState=e.nextState):e.animatedTransition&&e.animatedNextState&&(e.animated.transition=null,e.animated.nextState=null,e.animated.currentState=e.nextState,e.currentState=e.nextState,e.madeSteps++,e.inputWord.length==e.madeSteps&&(_.include(t.config.finalStates,e.currentState)?e.status="accepted":e.status="not accepted"),e.isNextStepCalculated=!1,e.animatedNextState=!1,e.animatedTransition=!1,e.processedWord+=e.nextChar,e.statusSequence.push(e.currentState),"accepted"!==e.status&&"not accepted"!==e.status&&e.calcNextStep()):(e.animatedTransition=!0,e.animated.transition=e.transition,e.goneTransitions.push(e.transition))},e.calcNextStep=function(){return e.isNextStepCalculated=!0,e.status="step",e.nextChar=e.inputWord[e.madeSteps],e.transition=_.filter(t.config.transitions,function(t){return void 0===e.nextChar?void(e.status="not accepted"):t.fromState==_.last(e.statusSequence)&&t.name==e.nextChar}),_.isEmpty(e.transition)?(e.transition=null,void(e.status="not accepted")):(e.transition=e.transition[0],void(e.nextState=e.transition.toState))},e.stepForward=function(){if(e.simulationPaused||e.pause(),e.simulationStarted){if(!_.include(["step","stopped","accepted","not accepted"],e.status))return void console.log(e.status);_.include(["accepted","not accepted"],e.status)||e.animateNextMove()}else e.prepareSimulation(),e.status="step"},e.stepBackward=function(){e.simulationPaused||e.pause(),_.include(["step","accepted","not accepted"],e.status)&&(e.status="step",e.animatedTransition||e.animatedNextState||0!==e.madeSteps?e.animateLastMove():e.reset())},e.animateLastMove=function(){console.log(e.animatedTransition+" "+e.animatedNextState),e.animatedTransition&&e.animatedNextState?(e.animated.nextState=null,e.animatedNextState=!1):e.animatedTransition?(e.animated.transition=null,e.animatedTransition=!1,e.goneTransitions.pop()):e.calcLastStep()},e.calcLastStep=function(){e.nextChar=e.processedWord.slice(-1),console.log(e.nextChar+" "+e.statusSequence[e.statusSequence.length-2]),e.transition=_.last(e.goneTransitions),console.log(e.transition),_.pullAt(e.goneTransitions,e.goneTransitions.length),e.animatedTransition=!0,e.animated.transition=e.transition;var t=e.currentState;e.currentState=e.transition.fromState,e.nextState=t,e.animated.nextState=e.nextState,e.animatedNextState=!0,e.animated.currentState=e.currentState,e.madeSteps--,e.statusSequence.splice(-1,1),e.processedWord=e.processedWord.slice(0,-1)},e.getNextTransition=function(e,a){for(var n=0;n<t.config.transitions.length;n++){var i=t.config.transitions[n];if(i.fromState==e&&i.name==a)return i}},e.check=function(){var a=!1,n=[];n.push(t.config.startState);for(var i="",r=0,s=null;r<=t.config.inputWord.length&&(i=t.config.inputWord[r],s=e.getNextTransition(_.last(n),i),!_.isEmpty(s));)if(n.push(s.toState),r++,t.config.inputWord.length==r){if(_.include(t.config.finalStates,_.last(n))){a=!0;break}break}return a},e.isPlayable=function(){return t.config.states.length>=1&&t.config.transitions.length>=1&&null!==t.config.startState&&t.config.finalStates.length>=1},e.playOrPause=function(){e.isPlayable()&&(e.isInPlay=!e.isInPlay,e.isInPlay?(e.simulationPaused=!1,e.play()):e.pause())},t.updateListeners.push(e),e.updateFunction=function(){e.isInputAccepted=e.check()}}function StateDiagramDFA(t,e){"use strict";function a(t,e){var a={x:t.y*e.z,y:-t.x*e.z};return a}function n(t){return t*(180/Math.PI)}function i(t){return t*(Math.PI/180)}function r(t,e){return{x:t.x*e,y:t.y*e}}function s(t){var e=1/Math.sqrt(t.x*t.x+t.y*t.y);return{x:t.x*e,y:t.y*e}}function o(t,e){var a=(t.x*e.x+t.y*e.y)/(Math.sqrt(t.x*t.x+t.y*t.y)*Math.sqrt(e.x*e.x+e.y*e.y)),i=Math.acos(a);return{val:a,rad:i,degree:n(i)}}function c(t,e){var a=t.x*e.x+t.y*e.y,n=t.x*e.y-t.y*e.x;return Math.atan2(n,a)}function d(t,e){var a=n(c(t,e));0>a&&(a+=360);var i=a+g;i>360&&(i-=360);var r=a-g;return 0>r&&(r+=360),{angle:a,lowerAngle:r,upperAngle:i}}var l=this;l.preventStateDragging=!1,l.inAddTransition=!1,l.selectedState=null,l.preventSvgOuterClick=!1,l.selectedTransition=null,l.showStateMenu=!1,l.showTransitionMenu=!1,l.selectedStateName="selectedForTransition",l.snapping=!0,l.settings={stateRadius:25,finalStateRadius:29,selected:!1};var u=40,f=18;l.stateSelfReferenceNumber=Math.sin(45*(Math.PI/180))*l.settings.stateRadius,l.existsDrawnTransition=function(e,a){for(var n=!1,i=0;i<t.config.drawnTransitions.length;i++){var r=t.config.drawnTransitions[i];r.fromState==e&&r.toState==a&&(n=!0)}return n},l.getDrawnTransition=function(e,a){for(var n=0;n<t.config.drawnTransitions.length;n++){var i=t.config.drawnTransitions[n];if(i.fromState==e&&i.toState==a)return i}},l.clearSvgContent=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgTransitions.html(""),l.svgStates.html(""),t.config.drawnTransitions=[],l.svg.attr("transform","translate("+t.defaultConfig.diagramm.x+","+t.defaultConfig.diagramm.y+") scale("+t.defaultConfig.diagramm.scale+")"),m.scale(t.defaultConfig.diagramm.scale),m.translate([t.defaultConfig.diagramm.x,t.defaultConfig.diagramm.y])},l.zoomMax=2.5,l.zoomMin=.5,l.zoomValue=.1,l.zoomIn=function(){t.config.diagramm.scale=t.config.diagramm.scale+l.zoomValue>l.zoomMax?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale+l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomOut=function(){t.config.diagramm.scale=t.config.diagramm.scale-l.zoomValue<=l.zoomMin?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale-l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomTo=function(e){console.log("zoomtedto"),t.config.diagramm.scale=e/100,t.safeApply(),l.updateZoomBehaviour()},l.updateZoomBehaviour=function(){t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")"),m.scale(t.config.diagramm.scale),m.translate([t.config.diagramm.x,t.config.diagramm.y])},l.zoomFitWindow=function(){var e,a=[],n=[],i=0,r=0,s=0,o=0,c=0,d=0,u=l.svgOuter.style("width").replace("px",""),f=l.svgOuter.style("height").replace("px","");if(t.config.diagramm.scale=1,t.config.states.length>0){for(e=0;e<t.config.states.length;e++)a[e]=t.config.states[e].x;for(e=0;e<t.config.states.length;e++)n[e]=t.config.states[e].y;for(i=_.min(a),r=_.max(a),s=_.min(n),o=_.max(n);r-i+150>u/t.config.diagramm.scale||o-s+200>f/t.config.diagramm.scale;)t.config.diagramm.scale-=.01;t.safeApply(),c=(f/t.config.diagramm.scale-(o-s))/2,d=(u/t.config.diagramm.scale-(r-i))/2,t.config.diagramm.x=-(i*t.config.diagramm.scale)+d*t.config.diagramm.scale,t.config.diagramm.y=-(s*t.config.diagramm.scale)+c*t.config.diagramm.scale,l.updateZoomBehaviour()}else l.scaleAndTranslateToDefault()},l.scaleAndTranslateToDefault=function(){t.config.diagramm.scale=t.defaultConfig.diagramm.scale,t.config.diagramm.x=t.defaultConfig.diagramm.x,t.config.diagramm.y=t.defaultConfig.diagramm.y,
t.safeApply(),l.updateZoomBehaviour()};var m=d3.behavior.zoom().scaleExtent([l.zoomMin,l.zoomMax]).on("zoom",function(){var e=d3.event.button||d3.event.ctrlKey;if(e&&d3.event.stopImmediatePropagation(),3!==d3.event.sourceEvent.which){var a=Math.floor(100*d3.event.scale)/100;t.config.diagramm.scale=a,t.config.diagramm.x=d3.event.translate[0],t.config.diagramm.y=d3.event.translate[1],t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")")}else console.log("rightclick!")});l.svgOuter=d3.select(e).call(m).on("dblclick.zoom",null).on("contextmenu",function(){d3.event.preventDefault()}),l.addSvgOuterClickListener=function(){l.svgOuter.on("click",function(){l.preventSvgOuterClick?l.preventSvgOuterClick=!1:(l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply())})},l.addSvgOuterClickListener(),l.svgGrid=l.svgOuter.append("g").attr("id","grid"),l.svg=l.svgOuter.append("g").attr("id","svg-items"),l.svgTransitions=l.svg.append("g").attr("id","transitions"),l.svgStates=l.svg.append("g").attr("id","states"),l.gridSpace=100,l.gridSnapDistance=20,l.isGrid=!0,t.$watch("[statediagram.isGrid , config.diagramm]",function(){l.drawGrid()},!0),l.drawGrid=function(){if(l.isGrid){l.svgGrid.html("");var e,a=l.svgOuter.style("width").replace("px",""),n=l.svgOuter.style("height").replace("px",""),i=1*t.config.diagramm.scale*.5,r=t.config.diagramm.x%(l.gridSpace*t.config.diagramm.scale),s=t.config.diagramm.y%(l.gridSpace*t.config.diagramm.scale);for(e=r;a>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line xgrid-line").attr("x1",e).attr("y1",0).attr("x2",e).attr("y2",n);for(e=s;n>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line ygrid-line").attr("x1",0).attr("y1",e).attr("x2",a).attr("y2",e)}else l.svgGrid.html("")},l.defs=l.svg.append("svg:defs"),l.defs.append("svg:marker").attr("id","marker-end-arrow").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-create").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-animated").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-hover").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-selection").attr("refX",4).attr("refY",3).attr("markerWidth",5).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.resetAddActions=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgOuter.on("click",null),l.inAddTransition=!1,l.inAddState=!1},l.addState=function(){l.resetAddActions(),l.svgOuter.on("mousemove",function(){l.selectedState.objReference.attr("transform","translate("+(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale)+" "+(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale)+")")}),l.selectedState=t.addStateWithPresets(-1e4,-1e4),l.selectedState.objReference.classed("state-in-creation",!0),l.svgOuter.on("click",function(){l.selectedState.objReference.classed("state-in-creation",!1),l.selectedState.x=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),l.selectedState.y=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),l.selectedState.objReference.attr("transform","translate("+l.selectedState.x+" "+l.selectedState.y+")"),l.svgOuter.on("mousemove",null),l.addSvgOuterClickListener(),l.preventSvgOuterClick=!1,t.safeApply()})},l.addTransition=function(){l.resetAddActions(),l.preventStateDragging=!0,d3.selectAll(".state").on("click",function(){if(l.mouseInState=!0,null===l.selectedState)l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.tmpTransition=l.svgTransitions.append("g").attr("class","transition"),l.tmpTransitionline=l.tmpTransition.append("path").attr("class","transition-line curvedLine in-creation").attr("marker-end","url(#marker-end-arrow-create)").attr("fill","none");else{var e=t.addTransition(l.selectedState.id,parseInt(d3.select(this).attr("object-id")),t.getNextTransitionName(l.selectedState.id));l.toggleState(l.selectedState.id,!1),l.tmpTransition.remove(),l.tmpTransition=null,l.tmpTransitionline=null,l.preventStateDragging=!1,l.addSvgOuterClickListener(),l.svgOuter.on("mousemove",null),d3.selectAll(".state").on("mouseover",null),d3.selectAll(".state").on("mouseleave",null),d3.selectAll(".state").on("click",l.openStateMenu),l.openTransitionMenu(e.id)}}),l.svgOuter.on("mousemove",function(){if(!l.mouseInState&&null!==l.selectedState){var e=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),a=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),n=l.bezierLine([[l.selectedState.x,l.selectedState.y],[e,a]]);l.tmpTransitionline.attr("d",n)}}),d3.selectAll(".state").on("mouseover",function(e){if(l.mouseInState=!0,null!==l.selectedState){var a=t.getStateById(d3.select(this).attr("object-id")),n={};n.fromState=l.selectedState.id,n.toState=a.id;var i=l.tmpTransitionline;if(l.existsDrawnTransition(l.selectedState.fromState,l.selectedState.toState)){var r=l.getDrawnTransition(n.fromState,n.toState);r.names.push(n.name),l.writeTransitionText(r.objReference.select(".transition-text"),r.names)}else if(n.fromState!=n.toState){var s=l.getTransitionDrawConfig(n);if(s.approachTransition){var o=l.getDrawnTransition(n.toState,n.fromState),c=l.getTransitionDrawConfig(o,!0);l.updateTransitionLines(o.objReference,c.path),o.objReference.select(".transition-text").attr("x",c.xText).attr("y",c.yText),l.otherTransition=o}i.attr("d",s.path)}else{var d=t.getArrayStateIdByStateId(n.fromState),u=t.config.states[d].x,f=t.config.states[d].y;i.attr("d",l.selfTransition(u,f))}l.tmpTransitionline.attr("x1",l.selectedState.x).attr("y1",l.selectedState.y).attr("x2",a.x).attr("y2",a.y)}}).on("mouseleave",function(){if(l.mouseInState=!1,null!==l.otherTransition&&void 0!==l.otherTransition){var t=l.getTransitionDrawConfig(l.otherTransition);l.updateTransitionLines(l.otherTransition.objReference,t.path),l.otherTransition.objReference.select(".transition-text").attr("x",t.xText).attr("y",t.yText)}})},l.renameState=function(e,a){var n=t.config.states[t.getArrayStateIdByStateId(e)],i=n.objReference;i.select("text").text(a)},l.removeState=function(e){l.closeStateMenu();var a=t.config.states[t.getArrayStateIdByStateId(e)],n=a.objReference;n.remove()},l.renameTransition=function(t,e,a,n){var i=l.getDrawnTransition(t,e),r=_.find(i.names,{id:a});r.name=n,l.writeTransitionText(i.objReference.select(".transition-text"),i.names)},l.removeTransition=function(e){var a=t.getTransitionById(e),n=l.getDrawnTransition(a.fromState,a.toState),i=l.getTransitionDrawConfig(a);if(l.closeTransitionMenu(),1===n.names.length){if(n.objReference.remove(),_.remove(t.config.drawnTransitions,function(t){return t==n}),i.approachTransition){var r=l.getDrawnTransition(a.toState,a.fromState),s=l.getTransitionDrawConfig(r,!1);l.updateTransitionLines(r.objReference,s.path),r.objReference.select(".transition-text").attr("x",s.xText).attr("y",s.yText),l.otherTransition=r}}else _.remove(n.names,function(t){return t.id==a.id}),l.writeTransitionText(n.objReference.select(".transition-text"),n.names),i=l.getTransitionDrawConfig(a),n.objReference.select(".transition-text").attr("x",i.xText).attr("y",i.yText),console.log(n),l.openTransitionMenu(n.names[n.names.length-1].id)},l.addFinalState=function(e){var a=t.getStateById(e);a.objReference.insert("circle",".state-circle").attr("class","final-state").attr("r",l.settings.finalStateRadius)},l.removeFinalState=function(e){var a=t.getStateById(e);a.objReference.select(".final-state").remove()},l.changeStartState=function(e){if(null!==t.config.startState){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove()}var n=t.getStateById(e);n.objReference.append("line").attr("class","transition-line start-line").attr("x1",0).attr("y1",-75).attr("x2",0).attr("y2",0-l.settings.stateRadius-4).attr("marker-end","url(#marker-end-arrow)")},l.removeStartState=function(e){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove(),t.config.startState=null,t.updateListener()},l.drawState=function(e){var a=t.getStateById(e),n=l.svgStates.append("g").attr("transform","translate("+a.x+" "+a.y+")").attr("class","state state-"+a.id).attr("object-id",a.id);return n.append("circle").attr("class","state-circle").attr("r",l.settings.stateRadius),n.append("circle").attr("class","state-circle hover-circle").attr("r",l.settings.stateRadius),n.append("text").text(a.name).attr("class","state-text").attr("dominant-baseline","central").attr("text-anchor","middle"),a.objReference=n,n.on("click",l.openStateMenu).call(l.dragState),n},l.setStateClassAs=function(e,a,n){var i=t.getStateById(e).objReference;i.classed(n,a)},l.setTransitionClassAs=function(e,a,n){var i=t.getTransitionById(e),r=l.getDrawnTransition(i.fromState,i.toState).objReference;r.classed(n,a),a&&"animated-transition"==n?r.select(".transition-line").attr("marker-end","url(#marker-end-arrow-animated)"):r.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.setArrowMarkerTo=function(t,e){""!==e?t.select(".transition-line").attr("marker-end","url(#marker-end-arrow-"+e+")"):t.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.openStateMenu=function(){console.log("open state menu"),l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply(),l.preventSvgOuterClick=!0,l.showStateMenu=!0,l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.input={},l.input.state=l.selectedState,l.input.stateName=l.selectedState.name,l.input.startState=t.config.startState==l.selectedState.id,l.input.finalState=t.isStateAFinalState(l.selectedState.id),l.input.ttt="",l.input.tttisopen=!1,t.safeApply(),l.stateMenuListener=[],l.stateMenuListener.push(t.$watch("statediagram.input.startState",function(e,a){e!==a&&(l.input.startState?t.changeStartState(l.input.state.id):l.selectedState.id==t.config.startState&&t.removeStartState())})),l.stateMenuListener.push(t.$watch("statediagram.input.finalState",function(e,a){e!==a&&(l.input.finalState?t.addFinalState(l.input.state.id):t.removeFinalState(l.input.state.id))})),l.stateMenuListener.push(t.$watch("statediagram.input.stateName",function(e,a){l.input.tttisopen=!1,e!==a&&(""===e||t.existsStateWithName(e)?""===e?(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_TOO_SHORT"):t.existsStateWithName(e,l.input.state.id)&&(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_ALREADY_EXIST"):!t.renameState(l.input.state.id,e))}))},l.closeStateMenu=function(){_.forEach(l.stateMenuListener,function(t,e){t()}),null!==l.selectedState&&l.toggleState(l.selectedState.id,!1),l.stateMenuListener=null,l.showStateMenu=!1,l.input=null},l.toggleState=function(t,e){l.setStateClassAs(t,e,"active"),e===!1&&(l.selectedState=null)},l.dragState=d3.behavior.drag().on("dragstart",function(){l.dragAmount=0,d3.event.sourceEvent.stopPropagation()}).on("drag",function(){if(1==d3.event.sourceEvent.which&&!l.preventStateDragging){l.dragAmount++;var e=d3.event.x,a=d3.event.y;if(l.snapping){var n=e-e%l.gridSpace,i=a-a%l.gridSpace;e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n,a=i):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n+l.gridSpace,a=i):e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance?(e=n,a=i+l.gridSpace):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance&&(e=n+l.gridSpace,a=i+l.gridSpace)}if(l.dragAmount>1){d3.select(this).attr("transform","translate("+e+" "+a+")");var r=d3.select(this).attr("object-id"),s=t.getStateById(r);s.x=e,s.y=a,l.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"))}}}).on("dragend",function(){l.dragAmount>1&&t.safeApply()}),l.selfTransition=function(t,e){return l.bezierLine([[t-l.stateSelfReferenceNumber,e-l.stateSelfReferenceNumber],[t-l.stateSelfReferenceNumber-u,e-l.stateSelfReferenceNumber-f],[t-l.stateSelfReferenceNumber-u,e+l.stateSelfReferenceNumber+f],[t-l.stateSelfReferenceNumber,e+l.stateSelfReferenceNumber]])};var g=30;l.bezierLine=d3.svg.line().x(function(t){return t[0]}).y(function(t){return t[1]}).interpolate("basis"),l.getTransitionDrawConfig=function(e,n){var c=3,u={};u.approachTransition=n||l.existsDrawnTransition(e.toState,e.fromState);var f,m=t.getStateById(e.fromState),g=t.getStateById(e.toState),S=t.isStateAFinalState(e.toState),p=m.x,v=m.y,h=g.x,T=g.y,x={x:h-p,y:T-v},y=Math.sqrt(x.x*x.x+x.y*x.y),A=l.settings.stateRadius/y;f=S?(l.settings.stateRadius+c+5)/y:(l.settings.stateRadius+c)/y,u.xStart=p+A*x.x,u.yStart=v+A*x.y,u.xEnd=h-f*x.x,u.yEnd=T-f*x.y,u.xDiff=h-p,u.yDiff=T-v,u.xMid=(p+h)/2,u.yMid=(v+T)/2,u.distance=Math.sqrt(u.xDiff*u.xDiff+u.yDiff*u.yDiff);var w,I,M={x:u.xMid-u.xStart,y:u.yMid-u.yStart,z:0},D={x:0,y:0,z:1},b={x:1,y:0,z:0};if(w=20,I=a(M,D),I=s(I),I=r(I,w),u.approachTransition){var C=d({x:u.xStart-p,y:u.yStart-v},{x:l.settings.stateRadius,y:0}),L=d({x:u.xEnd-h,y:u.yEnd-T},{x:l.settings.stateRadius,y:0});u.xStart=p+l.settings.stateRadius*Math.cos(i(C.upperAngle)),u.yStart=v-l.settings.stateRadius*Math.sin(i(C.upperAngle)),u.xEnd=h+l.settings.stateRadius*Math.cos(i(L.lowerAngle)),u.yEnd=T-l.settings.stateRadius*Math.sin(i(L.lowerAngle))}w=35,I=a(M,D),I=s(I),I=r(I,w),u.xMidCurv=I.x+u.xMid,u.yMidCurv=I.y+u.yMid;var k,R=(l.existsDrawnTransition(m.id,g.id),l.getDrawnTransition(m.id,g.id));k=R?R.names.length:1;var E,N,_=o(M,b),B=_.degree;B>90&&(B=90-B%90);var O=Math.pow(B/90,.5);E=u.approachTransition?40+8*k*O:12+8*k*O,N=a(M,D),N=s(N),N=r(N,E),u.xText=N.x+u.xMid,u.yText=N.y+u.yMid;var F=[];return F=u.approachTransition?[[u.xStart,u.yStart],[u.xMidCurv,u.yMidCurv],[u.xEnd,u.yEnd]]:[[u.xStart,u.yStart],[u.xEnd,u.yEnd]],u.path=l.bezierLine(F),u},l.writeTransitionText=function(e,a){e.selectAll("*").remove();for(var n=0;n<a.length;n++)null!==t.simulator.animated.transition&&a[n].id===t.simulator.animated.transition.id?e.append("tspan").attr("transition-id",a[n].id).text(a[n].name).classed("animated-transition-text",!0):e.append("tspan").attr("transition-id",a[n].id).text(a[n].name),n<a.length-1&&e.append("tspan").text(" | ")},l.drawTransition=function(e){var a=t.getTransitionById(e);if(!l.existsDrawnTransition(a.fromState,a.toState)){var n=l.svgTransitions.append("g").attr("class","transition"),i=(n.append("path").attr("class","transition-line-selection").attr("fill","none").attr("marker-end","url(#marker-end-arrow-selection)"),n.append("path").attr("class","transition-line").attr("fill","none").attr("marker-end","url(#marker-end-arrow)"),n.append("path").attr("class","transition-line-click").attr("stroke-width",20).attr("stroke","transparent").attr("fill","none"),n.append("path").attr("class","transition-line-hover").attr("fill","none").attr("marker-end","url(#marker-end-arrow-hover)"),n.append("text").attr("class","transition-text").attr("dominant-baseline","central").attr("fill","black"));if(a.fromState!=a.toState){var r=l.getTransitionDrawConfig(a);if(r.approachTransition){var s=l.getDrawnTransition(a.toState,a.fromState),o=l.getTransitionDrawConfig(s,!0);l.updateTransitionLines(s.objReference,o.path),s.objReference.select(".transition-text").attr("x",o.xText).attr("y",o.yText)}i.attr("class","transition-text").attr("x",r.xText).attr("y",r.yText),l.updateTransitionLines(n,r.path)}else{var c=t.getArrayStateIdByStateId(a.fromState),d=t.config.states[c].x,u=t.config.states[c].y;l.updateTransitionLines(n,l.selfTransition(d,u)),i.attr("x",d-l.settings.stateRadius-50).attr("y",u)}return n.attr("object-id",t.config.drawnTransitions.push({fromState:a.fromState,toState:a.toState,names:[{id:a.id,name:a.name}],objReference:n})-1),l.writeTransitionText(i,l.getDrawnTransition(a.fromState,a.toState).names),n.attr("from-state-id",a.fromState).attr("to-state-id",a.toState).on("click",l.openTransitionMenu).on("mouseover",function(){d3.select(this).select(".transition-line-hover").attr("style","opacity:0.6")}).on("mouseleave",function(){d3.select(this).select(".transition-line-hover").attr("style","")}),n}var f=l.getDrawnTransition(a.fromState,a.toState);f.names.push({id:a.id,name:a.name}),l.writeTransitionText(f.objReference.select(".transition-text"),l.getDrawnTransition(a.fromState,a.toState).names);var m=l.getTransitionDrawConfig(a);f.objReference.select(".transition-text").attr("x",m.xText).attr("y",m.yText)},l.updateTransitionLines=function(t,e){t.select(".transition-line").attr("d",e),t.select(".transition-line-selection").attr("d",e),t.select(".transition-line-hover").attr("d",e),t.select(".transition-line-click").attr("d",e)},l.openTransitionMenu=function(e){l.closeStateMenu(),l.closeTransitionMenu(),l.preventSvgOuterClick=!0,l.showTransitionMenu=!0;var a,n;if(void 0===e)a=d3.select(this).attr("from-state-id"),n=d3.select(this).attr("to-state-id"),l.selectedTransition=l.getDrawnTransition(a,n);else{var i=t.getTransitionById(e);a=i.fromState,n=i.toState,l.selectedTransition=l.getDrawnTransition(a,n)}l.selectedTransition.objReference.classed("active",!0),l.input={},l.input.fromState=t.getStateById(a),l.input.toState=t.getStateById(n),l.input.transitions=[],_.forEach(l.selectedTransition.names,function(t,a){var n={};n=cloneObject(t),void 0!==e?t.id==e&&(n.isFocus=!0):l.selectedTransition.names.length-1===a&&(n.isFocus=!0),n.ttt="",n.tttisopen=!1,l.input.transitions.push(n)}),l.transitionMenuListener=[];for(var r=0;r<l.input.transitions.length;r++)l.transitionMenuListener.push(t.$watchCollection("statediagram.input.transitions['"+r+"']",function(e,i){e.name!==i.name&&(e.tttisopen=!1,""===e.name||t.existsTransition(a,n,e.name)?""===e.name?(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_TOO_SHORT"):t.existsTransition(a,n,e.name,e.id)&&(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_ALREAD_EXISTS"):t.renameTransition(e.id,e.name),console.log(t.existsTransition(a,n,e.name,e.id)))}));t.safeApply()},l.closeTransitionMenu=function(){_.forEach(l.transitionMenuListener,function(t,e){t()}),l.showTransitionMenu=!1,null!==l.selectedTransition&&(l.selectedTransition.objReference.classed("active",!1),l.selectedTransition=null)},l.updateTransitionsAfterStateDrag=function(e){t.config.states[t.getArrayStateIdByStateId(e)].name,_.forEach(t.config.drawnTransitions,function(a,n){if(a.fromState==e||a.toState==e){var i=a.objReference,r=i.select("text");if(a.fromState!=a.toState){var s=l.getTransitionDrawConfig(a);l.updateTransitionLines(i,s.path),r.attr("x",s.xText).attr("y",s.yText)}else{var o=a.fromState,c=t.config.states[t.getArrayStateIdByStateId(o)].x,d=t.config.states[t.getArrayStateIdByStateId(o)].y;l.updateTransitionLines(i,l.selfTransition(c,d)),r.attr("x",c-l.settings.stateRadius-50).attr("y",d)}}})},t.$watch("simulator.animated.currentState",function(e,a){e!==a&&(console.log("CURRENTSTATE:oldValue "+a+" newvalue "+e),console.log("status"+t.simulator.status),null!==a&&(l.setStateClassAs(a,!1,"animated-currentstate-svg"),l.setStateClassAs(a,!1,"animated-accepted-svg"),l.setStateClassAs(a,!1,"animated-not-accepted-svg")),null!==e&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"):l.setStateClassAs(e,!0,"animated-currentstate-svg")))}),t.$watch("simulator.animated.transition",function(t,e){t!==e&&(null!==e&&(l.setTransitionClassAs(e.id,!1,"animated-transition"),d3.selectAll("[transition-id='"+e.id+"'").classed("animated-transition-text",!1)),null!==t&&(l.setTransitionClassAs(t.id,!0,"animated-transition"),console.log(t),d3.selectAll("[transition-id='"+t.id+"'").classed("animated-transition-text",!0)))}),t.$watch("simulator.animated.nextState",function(t,e){t!==e&&(console.log("NEXTSTATE: oldValue "+e+" newvalue "+t),null!==e&&l.setStateClassAs(e,!1,"animated-nextstate-svg"),null!==t&&l.setStateClassAs(t,!0,"animated-nextstate-svg"))}),t.$watch("simulator.status",function(e,a){e!==a&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status&&l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"))})}function StatetransitionfunctionDFA(t){"use strict";var e=this;e.functionData={},e.functionData.states=[],e.functionData.startState="",e.functionData.finalStates="",e.functionData.transitions="",e.functionData.statetransitionfunction=[],t.updateListeners.push(e),e.updateFunction=function(){var a,n="",i="",r="",s="";e.functionData.transitions=t.config.alphabet,e.functionData.states=[],_.forEach(t.config.states,function(a,i){n="";var r="";null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id&&(r="selected"),n+=a.id==t.simulator.animated.currentState&&"accepted"===t.simulator.status?'<span class="animated-accepted '+r+'">':a.id==t.simulator.animated.currentState&&"not accepted"===t.simulator.status?'<span class="animated-not-accepted '+r+'">':a.id==t.simulator.animated.currentState?'<span class="animated-currentstate '+r+'">':'<span class="'+r+'">',n+=a.name,n+="</span>",i<t.config.states.length-1&&(n+=", "),e.functionData.states.push(n)}),e.functionData.statetransitionfunction=[],_.forEach(t.config.states,function(a,n){_.forEach(t.config.transitions,function(n,r){if(n.fromState===a.id){var s=n,o=!1;null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{id:n.id})&&(o=!0);var c=!1;t.simulator.animated.transition&&t.simulator.animated.transition.id===s.id&&(c=!0),i=c||o?'(<span class=" '+(c?"animated-transition":"")+" "+(o?"selected":"")+'">':"(<span>",i+=t.getStateById(s.fromState).name+", ",i+=s.name+", ",i+=t.getStateById(s.toState).name+"</span>)",e.functionData.statetransitionfunction.push(i)}})}),a=t.getStateById(t.config.startState),void 0!==a&&(r+='<span class="">'+a.name+"</span>"),e.functionData.startState=r,_.forEach(t.config.finalStates,function(e,a){e=t.getStateById(e),s=e.name,a<t.config.finalStates.length-1&&(s+=", ")}),e.functionData.finalStates=s},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.status",function(t,a){t!==a&&e.updateFunction()})}function TableDFA(t){var e=this;e.states=[],t.updateListeners.push(e),e.updateFunction=function(){e.states=[],e.alphabet=[],t.config,_.forEach(t.config.alphabet,function(a,n){var i="";null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{name:a})&&(i="selected");var r;r=t.simulator.animated.transition&&t.simulator.animated.transition.name===a?'<span class="animated-transition '+i+'">'+a+"</span>":'<span class="'+i+'">'+a+"</span>",e.alphabet.push(r)}),_.forEach(t.config.states,function(a,n){var i={};i.id=a.id;var r="";if((null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id||null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.fromState===a.id)&&(r="selected"),t.simulator.animated.currentState==a.id){var s="";s="accepted"===t.simulator.status?"animated-accepted":"not accepted"===t.simulator.status?"animated-not-accepted":"animated-currentstate",i.name='<span class="'+s+" "+r+'">'+a.name+"</span>"}else i.name='<span class="'+r+'">'+a.name+"</span>";t.isStateAFinalState(a.id)?i.finalState=!0:i.finalState=!1,t.config.startState===a.id?i.startState=!0:i.startState=!1,i.trans=[],_.forEach(t.config.alphabet,function(e,n){var r=null;_.forEach(t.config.transitions,function(t,n){t.fromState===a.id&&t.name===e&&(r=t)});var s={};if(s.alphabet=e,null!==r){var o=t.getStateById(r.toState),c="";null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.toState===o.id&&(c="selected"),t.simulator.animated.nextState==o.id&&r.name==t.simulator.animated.transition.name?s.State='<span class="animated-nextstate '+c+'">'+o.name+"</span>":s.State='<span class="'+c+'">'+o.name+"</span>"}else s.State="";i.trans.push(s)}),e.states.push(i)})},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.nextState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()})}function SimulationDFA(t){"use strict";var e=this;e.isInPlay=!1,e.loopSimulation=!0,e.stepTimeOut=1500,e.loopTimeOut=2e3,e.simulationPaused=!1,e.simulationSettings=!0,e.currentState=null,e.nextState=null,e.transition=null,e.isInputAccepted=!1,e.settings=function(){e.simulationSettings=!e.simulationSettings},e.animated={currentState:null,transition:null,nextState:null},e.reset=function(){e.animated={currentState:null,transition:null,nextState:null},e.goneTransitions=[],e.currentState=t.config.startState,e.transition=null,e.animatedTransition=!1,e.nextState=null,e.animatedNextState=!1,e.isNextStepCalculated=!1,e.simulationStarted=!1,e.statusSequence=[t.config.startState],e.madeSteps=0,e.inputWord=t.config.inputWord,e.processedWord="",e.nextChar="",e.status="stopped"},e.pause=function(){e.simulationPaused||(e.simulationPaused=!0,e.isInPlay=!1)},e.stop=function(){e.pause(),e.reset()},e.play=function(){e.simulationPaused||(e.simulationStarted?((e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&(e.animateNextMove(),t.safeApply(function(){}),(e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&setTimeout(e.play,e.stepTimeOut)),e.isNextStepCalculated||"accepted"!=e.status||(e.loopSimulation?setTimeout(e.play,e.loopTimeOut):e.isInPlay=!1,e.simulationStarted=!1,t.safeApply(function(){}))):e.prepareSimulation())},e.prepareSimulation=function(){e.reset(),e.simulationStarted=!0,e.animated.currentState=_.last(e.statusSequence),t.safeApply(),setTimeout(e.play,e.loopTimeOut)},e.animateNextMove=function(){e.isNextStepCalculated||e.calcNextStep(),e.animatedTransition?!e.animatedNextState&&e.animatedTransition?(e.animatedNextState=!0,e.animated.nextState=e.nextState):e.animatedTransition&&e.animatedNextState&&(e.animated.transition=null,e.animated.nextState=null,e.animated.currentState=e.nextState,e.currentState=e.nextState,e.madeSteps++,e.inputWord.length==e.madeSteps&&(_.include(t.config.finalStates,e.currentState)?e.status="accepted":e.status="not accepted"),e.isNextStepCalculated=!1,e.animatedNextState=!1,e.animatedTransition=!1,e.processedWord+=e.nextChar,e.statusSequence.push(e.currentState),"accepted"!==e.status&&"not accepted"!==e.status&&e.calcNextStep()):(e.animatedTransition=!0,e.animated.transition=e.transition,e.goneTransitions.push(e.transition))},e.calcNextStep=function(){return e.isNextStepCalculated=!0,e.status="step",e.nextChar=e.inputWord[e.madeSteps],e.transition=_.filter(t.config.transitions,function(t){return void 0===e.nextChar?void(e.status="not accepted"):t.fromState==_.last(e.statusSequence)&&t.name==e.nextChar}),_.isEmpty(e.transition)?(e.transition=null,void(e.status="not accepted")):(e.transition=e.transition[0],void(e.nextState=e.transition.toState))},e.stepForward=function(){if(e.simulationPaused||e.pause(),e.simulationStarted){if(!_.include(["step","stopped","accepted","not accepted"],e.status))return void console.log(e.status);_.include(["accepted","not accepted"],e.status)||e.animateNextMove()}else e.prepareSimulation(),e.status="step"},e.stepBackward=function(){e.simulationPaused||e.pause(),_.include(["step","accepted","not accepted"],e.status)&&(e.status="step",e.animatedTransition||e.animatedNextState||0!==e.madeSteps?e.animateLastMove():e.reset())},e.animateLastMove=function(){console.log(e.animatedTransition+" "+e.animatedNextState),e.animatedTransition&&e.animatedNextState?(e.animated.nextState=null,e.animatedNextState=!1):e.animatedTransition?(e.animated.transition=null,e.animatedTransition=!1,e.goneTransitions.pop()):e.calcLastStep()},e.calcLastStep=function(){e.nextChar=e.processedWord.slice(-1),console.log(e.nextChar+" "+e.statusSequence[e.statusSequence.length-2]),e.transition=_.last(e.goneTransitions),console.log(e.transition),_.pullAt(e.goneTransitions,e.goneTransitions.length),e.animatedTransition=!0,e.animated.transition=e.transition;var t=e.currentState;e.currentState=e.transition.fromState,e.nextState=t,e.animated.nextState=e.nextState,e.animatedNextState=!0,e.animated.currentState=e.currentState,e.madeSteps--,e.statusSequence.splice(-1,1),e.processedWord=e.processedWord.slice(0,-1)},e.getNextTransition=function(e,a){for(var n=0;n<t.config.transitions.length;n++){var i=t.config.transitions[n];if(i.fromState==e&&i.name==a)return i}},e.check=function(){var a=!1,n=[];n.push(t.config.startState);for(var i="",r=0,s=null;r<=t.config.inputWord.length&&(i=t.config.inputWord[r],s=e.getNextTransition(_.last(n),i),!_.isEmpty(s));)if(n.push(s.toState),r++,t.config.inputWord.length==r){if(_.include(t.config.finalStates,_.last(n))){a=!0;break}break}return a},e.isPlayable=function(){return t.config.states.length>=1&&t.config.transitions.length>=1&&null!==t.config.startState&&t.config.finalStates.length>=1},e.playOrPause=function(){e.isPlayable()&&(e.isInPlay=!e.isInPlay,e.isInPlay?(e.simulationPaused=!1,e.play()):e.pause())},t.updateListeners.push(e),e.updateFunction=function(){e.isInputAccepted=e.check()}}function StateDiagramDFA(t,e){"use strict";function a(t,e){var a={x:t.y*e.z,y:-t.x*e.z};return a}function n(t){return t*(180/Math.PI)}function i(t){return t*(Math.PI/180)}function r(t,e){return{x:t.x*e,y:t.y*e}}function s(t){var e=1/Math.sqrt(t.x*t.x+t.y*t.y);return{x:t.x*e,y:t.y*e}}function o(t,e){var a=(t.x*e.x+t.y*e.y)/(Math.sqrt(t.x*t.x+t.y*t.y)*Math.sqrt(e.x*e.x+e.y*e.y)),i=Math.acos(a);return{val:a,rad:i,degree:n(i)}}function c(t,e){var a=t.x*e.x+t.y*e.y,n=t.x*e.y-t.y*e.x;return Math.atan2(n,a)}function d(t,e){var a=n(c(t,e));0>a&&(a+=360);var i=a+g;i>360&&(i-=360);var r=a-g;return 0>r&&(r+=360),{angle:a,lowerAngle:r,upperAngle:i}}var l=this;l.preventStateDragging=!1,l.inAddTransition=!1,l.selectedState=null,l.preventSvgOuterClick=!1,l.selectedTransition=null,l.showStateMenu=!1,l.showTransitionMenu=!1,l.selectedStateName="selectedForTransition",l.snapping=!0,l.settings={stateRadius:25,finalStateRadius:29,selected:!1};var u=40,f=18;l.stateSelfReferenceNumber=Math.sin(45*(Math.PI/180))*l.settings.stateRadius,l.existsDrawnTransition=function(e,a){for(var n=!1,i=0;i<t.config.drawnTransitions.length;i++){var r=t.config.drawnTransitions[i];r.fromState==e&&r.toState==a&&(n=!0)}return n},l.getDrawnTransition=function(e,a){for(var n=0;n<t.config.drawnTransitions.length;n++){var i=t.config.drawnTransitions[n];if(i.fromState==e&&i.toState==a)return i}},l.clearSvgContent=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgTransitions.html(""),l.svgStates.html(""),t.config.drawnTransitions=[],l.svg.attr("transform","translate("+t.defaultConfig.diagramm.x+","+t.defaultConfig.diagramm.y+") scale("+t.defaultConfig.diagramm.scale+")"),
m.scale(t.defaultConfig.diagramm.scale),m.translate([t.defaultConfig.diagramm.x,t.defaultConfig.diagramm.y])},l.zoomMax=2.5,l.zoomMin=.5,l.zoomValue=.1,l.zoomIn=function(){t.config.diagramm.scale=t.config.diagramm.scale+l.zoomValue>l.zoomMax?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale+l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomOut=function(){t.config.diagramm.scale=t.config.diagramm.scale-l.zoomValue<=l.zoomMin?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale-l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomTo=function(e){console.log("zoomtedto"),t.config.diagramm.scale=e/100,t.safeApply(),l.updateZoomBehaviour()},l.updateZoomBehaviour=function(){t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")"),m.scale(t.config.diagramm.scale),m.translate([t.config.diagramm.x,t.config.diagramm.y])},l.zoomFitWindow=function(){var e,a=[],n=[],i=0,r=0,s=0,o=0,c=0,d=0,u=l.svgOuter.style("width").replace("px",""),f=l.svgOuter.style("height").replace("px","");if(t.config.diagramm.scale=1,t.config.states.length>0){for(e=0;e<t.config.states.length;e++)a[e]=t.config.states[e].x;for(e=0;e<t.config.states.length;e++)n[e]=t.config.states[e].y;for(i=_.min(a),r=_.max(a),s=_.min(n),o=_.max(n);r-i+150>u/t.config.diagramm.scale||o-s+200>f/t.config.diagramm.scale;)t.config.diagramm.scale-=.01;t.safeApply(),c=(f/t.config.diagramm.scale-(o-s))/2,d=(u/t.config.diagramm.scale-(r-i))/2,t.config.diagramm.x=-(i*t.config.diagramm.scale)+d*t.config.diagramm.scale,t.config.diagramm.y=-(s*t.config.diagramm.scale)+c*t.config.diagramm.scale,l.updateZoomBehaviour()}else l.scaleAndTranslateToDefault()},l.scaleAndTranslateToDefault=function(){t.config.diagramm.scale=t.defaultConfig.diagramm.scale,t.config.diagramm.x=t.defaultConfig.diagramm.x,t.config.diagramm.y=t.defaultConfig.diagramm.y,t.safeApply(),l.updateZoomBehaviour()};var m=d3.behavior.zoom().scaleExtent([l.zoomMin,l.zoomMax]).on("zoom",function(){var e=d3.event.button||d3.event.ctrlKey;if(e&&d3.event.stopImmediatePropagation(),3!==d3.event.sourceEvent.which){var a=Math.floor(100*d3.event.scale)/100;t.config.diagramm.scale=a,t.config.diagramm.x=d3.event.translate[0],t.config.diagramm.y=d3.event.translate[1],t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")")}else console.log("rightclick!")});l.svgOuter=d3.select(e).call(m).on("dblclick.zoom",null).on("contextmenu",function(){d3.event.preventDefault()}),l.addSvgOuterClickListener=function(){l.svgOuter.on("click",function(){l.preventSvgOuterClick?l.preventSvgOuterClick=!1:(l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply())})},l.addSvgOuterClickListener(),l.svgGrid=l.svgOuter.append("g").attr("id","grid"),l.svg=l.svgOuter.append("g").attr("id","svg-items"),l.svgTransitions=l.svg.append("g").attr("id","transitions"),l.svgStates=l.svg.append("g").attr("id","states"),l.gridSpace=100,l.gridSnapDistance=20,l.isGrid=!0,t.$watch("[statediagram.isGrid , config.diagramm]",function(){l.drawGrid()},!0),l.drawGrid=function(){if(l.isGrid){l.svgGrid.html("");var e,a=l.svgOuter.style("width").replace("px",""),n=l.svgOuter.style("height").replace("px",""),i=1*t.config.diagramm.scale*.5,r=t.config.diagramm.x%(l.gridSpace*t.config.diagramm.scale),s=t.config.diagramm.y%(l.gridSpace*t.config.diagramm.scale);for(e=r;a>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line xgrid-line").attr("x1",e).attr("y1",0).attr("x2",e).attr("y2",n);for(e=s;n>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line ygrid-line").attr("x1",0).attr("y1",e).attr("x2",a).attr("y2",e)}else l.svgGrid.html("")},l.defs=l.svg.append("svg:defs"),l.defs.append("svg:marker").attr("id","marker-end-arrow").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-create").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-animated").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-hover").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-selection").attr("refX",4).attr("refY",3).attr("markerWidth",5).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.resetAddActions=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgOuter.on("click",null),l.inAddTransition=!1,l.inAddState=!1},l.addState=function(){l.resetAddActions(),l.svgOuter.on("mousemove",function(){l.selectedState.objReference.attr("transform","translate("+(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale)+" "+(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale)+")")}),l.selectedState=t.addStateWithPresets(-1e4,-1e4),l.selectedState.objReference.classed("state-in-creation",!0),l.svgOuter.on("click",function(){l.selectedState.objReference.classed("state-in-creation",!1),l.selectedState.x=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),l.selectedState.y=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),l.selectedState.objReference.attr("transform","translate("+l.selectedState.x+" "+l.selectedState.y+")"),l.svgOuter.on("mousemove",null),l.addSvgOuterClickListener(),l.preventSvgOuterClick=!1,t.safeApply()})},l.addTransition=function(){l.resetAddActions(),l.preventStateDragging=!0,d3.selectAll(".state").on("click",function(){if(l.mouseInState=!0,null===l.selectedState)l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.tmpTransition=l.svgTransitions.append("g").attr("class","transition"),l.tmpTransitionline=l.tmpTransition.append("path").attr("class","transition-line curvedLine in-creation").attr("marker-end","url(#marker-end-arrow-create)").attr("fill","none");else{var e=t.addTransition(l.selectedState.id,parseInt(d3.select(this).attr("object-id")),t.getNextTransitionName(l.selectedState.id));l.toggleState(l.selectedState.id,!1),l.tmpTransition.remove(),l.tmpTransition=null,l.tmpTransitionline=null,l.preventStateDragging=!1,l.addSvgOuterClickListener(),l.svgOuter.on("mousemove",null),d3.selectAll(".state").on("mouseover",null),d3.selectAll(".state").on("mouseleave",null),d3.selectAll(".state").on("click",l.openStateMenu),l.openTransitionMenu(e.id)}}),l.svgOuter.on("mousemove",function(){if(!l.mouseInState&&null!==l.selectedState){var e=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),a=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),n=l.bezierLine([[l.selectedState.x,l.selectedState.y],[e,a]]);l.tmpTransitionline.attr("d",n)}}),d3.selectAll(".state").on("mouseover",function(e){if(l.mouseInState=!0,null!==l.selectedState){var a=t.getStateById(d3.select(this).attr("object-id")),n={};n.fromState=l.selectedState.id,n.toState=a.id;var i=l.tmpTransitionline;if(l.existsDrawnTransition(l.selectedState.fromState,l.selectedState.toState)){var r=l.getDrawnTransition(n.fromState,n.toState);r.names.push(n.name),l.writeTransitionText(r.objReference.select(".transition-text"),r.names)}else if(n.fromState!=n.toState){var s=l.getTransitionDrawConfig(n);if(s.approachTransition){var o=l.getDrawnTransition(n.toState,n.fromState),c=l.getTransitionDrawConfig(o,!0);l.updateTransitionLines(o.objReference,c.path),o.objReference.select(".transition-text").attr("x",c.xText).attr("y",c.yText),l.otherTransition=o}i.attr("d",s.path)}else{var d=t.getArrayStateIdByStateId(n.fromState),u=t.config.states[d].x,f=t.config.states[d].y;i.attr("d",l.selfTransition(u,f))}l.tmpTransitionline.attr("x1",l.selectedState.x).attr("y1",l.selectedState.y).attr("x2",a.x).attr("y2",a.y)}}).on("mouseleave",function(){if(l.mouseInState=!1,null!==l.otherTransition&&void 0!==l.otherTransition){var t=l.getTransitionDrawConfig(l.otherTransition);l.updateTransitionLines(l.otherTransition.objReference,t.path),l.otherTransition.objReference.select(".transition-text").attr("x",t.xText).attr("y",t.yText)}})},l.renameState=function(e,a){var n=t.config.states[t.getArrayStateIdByStateId(e)],i=n.objReference;i.select("text").text(a)},l.removeState=function(e){l.closeStateMenu();var a=t.config.states[t.getArrayStateIdByStateId(e)],n=a.objReference;n.remove()},l.renameTransition=function(t,e,a,n){var i=l.getDrawnTransition(t,e),r=_.find(i.names,{id:a});r.name=n,l.writeTransitionText(i.objReference.select(".transition-text"),i.names)},l.removeTransition=function(e){var a=t.getTransitionById(e),n=l.getDrawnTransition(a.fromState,a.toState),i=l.getTransitionDrawConfig(a);if(l.closeTransitionMenu(),1===n.names.length){if(n.objReference.remove(),_.remove(t.config.drawnTransitions,function(t){return t==n}),i.approachTransition){var r=l.getDrawnTransition(a.toState,a.fromState),s=l.getTransitionDrawConfig(r,!1);l.updateTransitionLines(r.objReference,s.path),r.objReference.select(".transition-text").attr("x",s.xText).attr("y",s.yText),l.otherTransition=r}}else _.remove(n.names,function(t){return t.id==a.id}),l.writeTransitionText(n.objReference.select(".transition-text"),n.names),i=l.getTransitionDrawConfig(a),n.objReference.select(".transition-text").attr("x",i.xText).attr("y",i.yText),console.log(n),l.openTransitionMenu(n.names[n.names.length-1].id)},l.addFinalState=function(e){var a=t.getStateById(e);a.objReference.insert("circle",".state-circle").attr("class","final-state").attr("r",l.settings.finalStateRadius)},l.removeFinalState=function(e){var a=t.getStateById(e);a.objReference.select(".final-state").remove()},l.changeStartState=function(e){if(null!==t.config.startState){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove()}var n=t.getStateById(e);n.objReference.append("line").attr("class","transition-line start-line").attr("x1",0).attr("y1",-75).attr("x2",0).attr("y2",0-l.settings.stateRadius-4).attr("marker-end","url(#marker-end-arrow)")},l.removeStartState=function(e){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove(),t.config.startState=null,t.updateListener()},l.drawState=function(e){var a=t.getStateById(e),n=l.svgStates.append("g").attr("transform","translate("+a.x+" "+a.y+")").attr("class","state state-"+a.id).attr("object-id",a.id);return n.append("circle").attr("class","state-circle").attr("r",l.settings.stateRadius),n.append("circle").attr("class","state-circle hover-circle").attr("r",l.settings.stateRadius),n.append("text").text(a.name).attr("class","state-text").attr("dominant-baseline","central").attr("text-anchor","middle"),a.objReference=n,n.on("click",l.openStateMenu).call(l.dragState),n},l.setStateClassAs=function(e,a,n){var i=t.getStateById(e).objReference;i.classed(n,a)},l.setTransitionClassAs=function(e,a,n){var i=t.getTransitionById(e),r=l.getDrawnTransition(i.fromState,i.toState).objReference;r.classed(n,a),a&&"animated-transition"==n?r.select(".transition-line").attr("marker-end","url(#marker-end-arrow-animated)"):r.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.setArrowMarkerTo=function(t,e){""!==e?t.select(".transition-line").attr("marker-end","url(#marker-end-arrow-"+e+")"):t.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.openStateMenu=function(){console.log("open state menu"),l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply(),l.preventSvgOuterClick=!0,l.showStateMenu=!0,l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.input={},l.input.state=l.selectedState,l.input.stateName=l.selectedState.name,l.input.startState=t.config.startState==l.selectedState.id,l.input.finalState=t.isStateAFinalState(l.selectedState.id),l.input.ttt="",l.input.tttisopen=!1,t.safeApply(),l.stateMenuListener=[],l.stateMenuListener.push(t.$watch("statediagram.input.startState",function(e,a){e!==a&&(l.input.startState?t.changeStartState(l.input.state.id):l.selectedState.id==t.config.startState&&t.removeStartState())})),l.stateMenuListener.push(t.$watch("statediagram.input.finalState",function(e,a){e!==a&&(l.input.finalState?t.addFinalState(l.input.state.id):t.removeFinalState(l.input.state.id))})),l.stateMenuListener.push(t.$watch("statediagram.input.stateName",function(e,a){l.input.tttisopen=!1,e!==a&&(""===e||t.existsStateWithName(e)?""===e?(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_TOO_SHORT"):t.existsStateWithName(e,l.input.state.id)&&(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_ALREADY_EXIST"):!t.renameState(l.input.state.id,e))}))},l.closeStateMenu=function(){_.forEach(l.stateMenuListener,function(t,e){t()}),null!==l.selectedState&&l.toggleState(l.selectedState.id,!1),l.stateMenuListener=null,l.showStateMenu=!1,l.input=null},l.toggleState=function(t,e){l.setStateClassAs(t,e,"active"),e===!1&&(l.selectedState=null)},l.dragState=d3.behavior.drag().on("dragstart",function(){l.dragAmount=0,d3.event.sourceEvent.stopPropagation()}).on("drag",function(){if(1==d3.event.sourceEvent.which&&!l.preventStateDragging){l.dragAmount++;var e=d3.event.x,a=d3.event.y;if(l.snapping){var n=e-e%l.gridSpace,i=a-a%l.gridSpace;e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n,a=i):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n+l.gridSpace,a=i):e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance?(e=n,a=i+l.gridSpace):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance&&(e=n+l.gridSpace,a=i+l.gridSpace)}if(l.dragAmount>1){d3.select(this).attr("transform","translate("+e+" "+a+")");var r=d3.select(this).attr("object-id"),s=t.getStateById(r);s.x=e,s.y=a,l.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"))}}}).on("dragend",function(){l.dragAmount>1&&t.safeApply()}),l.selfTransition=function(t,e){return l.bezierLine([[t-l.stateSelfReferenceNumber,e-l.stateSelfReferenceNumber],[t-l.stateSelfReferenceNumber-u,e-l.stateSelfReferenceNumber-f],[t-l.stateSelfReferenceNumber-u,e+l.stateSelfReferenceNumber+f],[t-l.stateSelfReferenceNumber,e+l.stateSelfReferenceNumber]])};var g=30;l.bezierLine=d3.svg.line().x(function(t){return t[0]}).y(function(t){return t[1]}).interpolate("basis"),l.getTransitionDrawConfig=function(e,n){var c=3,u={};u.approachTransition=n||l.existsDrawnTransition(e.toState,e.fromState);var f,m=t.getStateById(e.fromState),g=t.getStateById(e.toState),S=t.isStateAFinalState(e.toState),p=m.x,v=m.y,h=g.x,T=g.y,x={x:h-p,y:T-v},y=Math.sqrt(x.x*x.x+x.y*x.y),A=l.settings.stateRadius/y;f=S?(l.settings.stateRadius+c+5)/y:(l.settings.stateRadius+c)/y,u.xStart=p+A*x.x,u.yStart=v+A*x.y,u.xEnd=h-f*x.x,u.yEnd=T-f*x.y,u.xDiff=h-p,u.yDiff=T-v,u.xMid=(p+h)/2,u.yMid=(v+T)/2,u.distance=Math.sqrt(u.xDiff*u.xDiff+u.yDiff*u.yDiff);var w,I,M={x:u.xMid-u.xStart,y:u.yMid-u.yStart,z:0},D={x:0,y:0,z:1},b={x:1,y:0,z:0};if(w=20,I=a(M,D),I=s(I),I=r(I,w),u.approachTransition){var C=d({x:u.xStart-p,y:u.yStart-v},{x:l.settings.stateRadius,y:0}),L=d({x:u.xEnd-h,y:u.yEnd-T},{x:l.settings.stateRadius,y:0});u.xStart=p+l.settings.stateRadius*Math.cos(i(C.upperAngle)),u.yStart=v-l.settings.stateRadius*Math.sin(i(C.upperAngle)),u.xEnd=h+l.settings.stateRadius*Math.cos(i(L.lowerAngle)),u.yEnd=T-l.settings.stateRadius*Math.sin(i(L.lowerAngle))}w=35,I=a(M,D),I=s(I),I=r(I,w),u.xMidCurv=I.x+u.xMid,u.yMidCurv=I.y+u.yMid;var k,R=(l.existsDrawnTransition(m.id,g.id),l.getDrawnTransition(m.id,g.id));k=R?R.names.length:1;var E,N,_=o(M,b),B=_.degree;B>90&&(B=90-B%90);var O=Math.pow(B/90,.5);E=u.approachTransition?40+8*k*O:12+8*k*O,N=a(M,D),N=s(N),N=r(N,E),u.xText=N.x+u.xMid,u.yText=N.y+u.yMid;var F=[];return F=u.approachTransition?[[u.xStart,u.yStart],[u.xMidCurv,u.yMidCurv],[u.xEnd,u.yEnd]]:[[u.xStart,u.yStart],[u.xEnd,u.yEnd]],u.path=l.bezierLine(F),u},l.writeTransitionText=function(e,a){e.selectAll("*").remove();for(var n=0;n<a.length;n++)null!==t.simulator.animated.transition&&a[n].id===t.simulator.animated.transition.id?e.append("tspan").attr("transition-id",a[n].id).text(a[n].name).classed("animated-transition-text",!0):e.append("tspan").attr("transition-id",a[n].id).text(a[n].name),n<a.length-1&&e.append("tspan").text(" | ")},l.drawTransition=function(e){var a=t.getTransitionById(e);if(!l.existsDrawnTransition(a.fromState,a.toState)){var n=l.svgTransitions.append("g").attr("class","transition"),i=(n.append("path").attr("class","transition-line-selection").attr("fill","none").attr("marker-end","url(#marker-end-arrow-selection)"),n.append("path").attr("class","transition-line").attr("fill","none").attr("marker-end","url(#marker-end-arrow)"),n.append("path").attr("class","transition-line-click").attr("stroke-width",20).attr("stroke","transparent").attr("fill","none"),n.append("path").attr("class","transition-line-hover").attr("fill","none").attr("marker-end","url(#marker-end-arrow-hover)"),n.append("text").attr("class","transition-text").attr("dominant-baseline","central").attr("fill","black"));if(a.fromState!=a.toState){var r=l.getTransitionDrawConfig(a);if(r.approachTransition){var s=l.getDrawnTransition(a.toState,a.fromState),o=l.getTransitionDrawConfig(s,!0);l.updateTransitionLines(s.objReference,o.path),s.objReference.select(".transition-text").attr("x",o.xText).attr("y",o.yText)}i.attr("class","transition-text").attr("x",r.xText).attr("y",r.yText),l.updateTransitionLines(n,r.path)}else{var c=t.getArrayStateIdByStateId(a.fromState),d=t.config.states[c].x,u=t.config.states[c].y;l.updateTransitionLines(n,l.selfTransition(d,u)),i.attr("x",d-l.settings.stateRadius-50).attr("y",u)}return n.attr("object-id",t.config.drawnTransitions.push({fromState:a.fromState,toState:a.toState,names:[{id:a.id,name:a.name}],objReference:n})-1),l.writeTransitionText(i,l.getDrawnTransition(a.fromState,a.toState).names),n.attr("from-state-id",a.fromState).attr("to-state-id",a.toState).on("click",l.openTransitionMenu).on("mouseover",function(){d3.select(this).select(".transition-line-hover").attr("style","opacity:0.6")}).on("mouseleave",function(){d3.select(this).select(".transition-line-hover").attr("style","")}),n}var f=l.getDrawnTransition(a.fromState,a.toState);f.names.push({id:a.id,name:a.name}),l.writeTransitionText(f.objReference.select(".transition-text"),l.getDrawnTransition(a.fromState,a.toState).names);var m=l.getTransitionDrawConfig(a);f.objReference.select(".transition-text").attr("x",m.xText).attr("y",m.yText)},l.updateTransitionLines=function(t,e){t.select(".transition-line").attr("d",e),t.select(".transition-line-selection").attr("d",e),t.select(".transition-line-hover").attr("d",e),t.select(".transition-line-click").attr("d",e)},l.openTransitionMenu=function(e){l.closeStateMenu(),l.closeTransitionMenu(),l.preventSvgOuterClick=!0,l.showTransitionMenu=!0;var a,n;if(void 0===e)a=d3.select(this).attr("from-state-id"),n=d3.select(this).attr("to-state-id"),l.selectedTransition=l.getDrawnTransition(a,n);else{var i=t.getTransitionById(e);a=i.fromState,n=i.toState,l.selectedTransition=l.getDrawnTransition(a,n)}l.selectedTransition.objReference.classed("active",!0),l.input={},l.input.fromState=t.getStateById(a),l.input.toState=t.getStateById(n),l.input.transitions=[],_.forEach(l.selectedTransition.names,function(t,a){var n={};n=cloneObject(t),void 0!==e?t.id==e&&(n.isFocus=!0):l.selectedTransition.names.length-1===a&&(n.isFocus=!0),n.ttt="",n.tttisopen=!1,l.input.transitions.push(n)}),l.transitionMenuListener=[];for(var r=0;r<l.input.transitions.length;r++)l.transitionMenuListener.push(t.$watchCollection("statediagram.input.transitions['"+r+"']",function(e,i){e.name!==i.name&&(e.tttisopen=!1,""===e.name||t.existsTransition(a,n,e.name)?""===e.name?(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_TOO_SHORT"):t.existsTransition(a,n,e.name,e.id)&&(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_ALREAD_EXISTS"):t.renameTransition(e.id,e.name),console.log(t.existsTransition(a,n,e.name,e.id)))}));t.safeApply()},l.closeTransitionMenu=function(){_.forEach(l.transitionMenuListener,function(t,e){t()}),l.showTransitionMenu=!1,null!==l.selectedTransition&&(l.selectedTransition.objReference.classed("active",!1),l.selectedTransition=null)},l.updateTransitionsAfterStateDrag=function(e){t.config.states[t.getArrayStateIdByStateId(e)].name,_.forEach(t.config.drawnTransitions,function(a,n){if(a.fromState==e||a.toState==e){var i=a.objReference,r=i.select("text");if(a.fromState!=a.toState){var s=l.getTransitionDrawConfig(a);l.updateTransitionLines(i,s.path),r.attr("x",s.xText).attr("y",s.yText)}else{var o=a.fromState,c=t.config.states[t.getArrayStateIdByStateId(o)].x,d=t.config.states[t.getArrayStateIdByStateId(o)].y;l.updateTransitionLines(i,l.selfTransition(c,d)),r.attr("x",c-l.settings.stateRadius-50).attr("y",d)}}})},t.$watch("simulator.animated.currentState",function(e,a){e!==a&&(console.log("CURRENTSTATE:oldValue "+a+" newvalue "+e),console.log("status"+t.simulator.status),null!==a&&(l.setStateClassAs(a,!1,"animated-currentstate-svg"),l.setStateClassAs(a,!1,"animated-accepted-svg"),l.setStateClassAs(a,!1,"animated-not-accepted-svg")),null!==e&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"):l.setStateClassAs(e,!0,"animated-currentstate-svg")))}),t.$watch("simulator.animated.transition",function(t,e){t!==e&&(null!==e&&(l.setTransitionClassAs(e.id,!1,"animated-transition"),d3.selectAll("[transition-id='"+e.id+"'").classed("animated-transition-text",!1)),null!==t&&(l.setTransitionClassAs(t.id,!0,"animated-transition"),console.log(t),d3.selectAll("[transition-id='"+t.id+"'").classed("animated-transition-text",!0)))}),t.$watch("simulator.animated.nextState",function(t,e){t!==e&&(console.log("NEXTSTATE: oldValue "+e+" newvalue "+t),null!==e&&l.setStateClassAs(e,!1,"animated-nextstate-svg"),null!==t&&l.setStateClassAs(t,!0,"animated-nextstate-svg"))}),t.$watch("simulator.status",function(e,a){e!==a&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status&&l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"))})}function StatetransitionfunctionDFA(t){"use strict";var e=this;e.functionData={},e.functionData.states=[],e.functionData.startState="",e.functionData.finalStates="",e.functionData.transitions="",e.functionData.statetransitionfunction=[],t.updateListeners.push(e),e.updateFunction=function(){var a,n="",i="",r="",s="";e.functionData.transitions=t.config.alphabet,e.functionData.states=[],_.forEach(t.config.states,function(a,i){n="";var r="";null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id&&(r="selected"),n+=a.id==t.simulator.animated.currentState&&"accepted"===t.simulator.status?'<span class="animated-accepted '+r+'">':a.id==t.simulator.animated.currentState&&"not accepted"===t.simulator.status?'<span class="animated-not-accepted '+r+'">':a.id==t.simulator.animated.currentState?'<span class="animated-currentstate '+r+'">':'<span class="'+r+'">',n+=a.name,n+="</span>",i<t.config.states.length-1&&(n+=", "),e.functionData.states.push(n)}),e.functionData.statetransitionfunction=[],_.forEach(t.config.states,function(a,n){_.forEach(t.config.transitions,function(n,r){if(n.fromState===a.id){var s=n,o=!1;null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{id:n.id})&&(o=!0);var c=!1;t.simulator.animated.transition&&t.simulator.animated.transition.id===s.id&&(c=!0),i=c||o?'(<span class=" '+(c?"animated-transition":"")+" "+(o?"selected":"")+'">':"(<span>",i+=t.getStateById(s.fromState).name+", ",i+=s.name+", ",i+=t.getStateById(s.toState).name+"</span>)",e.functionData.statetransitionfunction.push(i)}})}),a=t.getStateById(t.config.startState),void 0!==a&&(r+='<span class="">'+a.name+"</span>"),e.functionData.startState=r,_.forEach(t.config.finalStates,function(e,a){e=t.getStateById(e),s=e.name,a<t.config.finalStates.length-1&&(s+=", ")}),e.functionData.finalStates=s},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.status",function(t,a){t!==a&&e.updateFunction()})}function TableDFA(t){var e=this;e.states=[],t.updateListeners.push(e),e.updateFunction=function(){e.states=[],e.alphabet=[],t.config,_.forEach(t.config.alphabet,function(a,n){var i="";null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{name:a})&&(i="selected");var r;r=t.simulator.animated.transition&&t.simulator.animated.transition.name===a?'<span class="animated-transition '+i+'">'+a+"</span>":'<span class="'+i+'">'+a+"</span>",e.alphabet.push(r)}),_.forEach(t.config.states,function(a,n){var i={};i.id=a.id;var r="";if((null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id||null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.fromState===a.id)&&(r="selected"),t.simulator.animated.currentState==a.id){var s="";s="accepted"===t.simulator.status?"animated-accepted":"not accepted"===t.simulator.status?"animated-not-accepted":"animated-currentstate",i.name='<span class="'+s+" "+r+'">'+a.name+"</span>"}else i.name='<span class="'+r+'">'+a.name+"</span>";t.isStateAFinalState(a.id)?i.finalState=!0:i.finalState=!1,t.config.startState===a.id?i.startState=!0:i.startState=!1,i.trans=[],_.forEach(t.config.alphabet,function(e,n){var r=null;_.forEach(t.config.transitions,function(t,n){t.fromState===a.id&&t.name===e&&(r=t)});var s={};if(s.alphabet=e,null!==r){var o=t.getStateById(r.toState),c="";null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.toState===o.id&&(c="selected"),t.simulator.animated.nextState==o.id&&r.name==t.simulator.animated.transition.name?s.State='<span class="animated-nextstate '+c+'">'+o.name+"</span>":s.State='<span class="'+c+'">'+o.name+"</span>"}else s.State="";i.trans.push(s)}),e.states.push(i)})},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.nextState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()})}function SimulationDFA(t){"use strict";var e=this;e.isInPlay=!1,e.loopSimulation=!0,e.stepTimeOut=1500,e.loopTimeOut=2e3,e.simulationPaused=!1,e.simulationSettings=!0,e.currentState=null,e.nextState=null,e.transition=null,e.isInputAccepted=!1,e.settings=function(){e.simulationSettings=!e.simulationSettings},e.animated={currentState:null,transition:null,nextState:null},e.reset=function(){e.animated={currentState:null,transition:null,nextState:null},e.goneTransitions=[],e.currentState=t.config.startState,e.transition=null,e.animatedTransition=!1,e.nextState=null,e.animatedNextState=!1,e.isNextStepCalculated=!1,e.simulationStarted=!1,e.statusSequence=[t.config.startState],e.madeSteps=0,e.inputWord=t.config.inputWord,e.processedWord="",e.nextChar="",e.status="stopped"},e.pause=function(){e.simulationPaused||(e.simulationPaused=!0,e.isInPlay=!1)},e.stop=function(){e.pause(),e.reset()},e.play=function(){e.simulationPaused||(e.simulationStarted?((e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&(e.animateNextMove(),t.safeApply(function(){}),(e.isNextStepCalculated||"accepted"!=e.status&&"not accepted"!=e.status)&&setTimeout(e.play,e.stepTimeOut)),e.isNextStepCalculated||"accepted"!=e.status||(e.loopSimulation?setTimeout(e.play,e.loopTimeOut):e.isInPlay=!1,e.simulationStarted=!1,t.safeApply(function(){}))):e.prepareSimulation())},e.prepareSimulation=function(){e.reset(),e.simulationStarted=!0,e.animated.currentState=_.last(e.statusSequence),t.safeApply(),setTimeout(e.play,e.loopTimeOut)},e.animateNextMove=function(){e.isNextStepCalculated||e.calcNextStep(),e.animatedTransition?!e.animatedNextState&&e.animatedTransition?(e.animatedNextState=!0,e.animated.nextState=e.nextState):e.animatedTransition&&e.animatedNextState&&(e.animated.transition=null,e.animated.nextState=null,e.animated.currentState=e.nextState,e.currentState=e.nextState,e.madeSteps++,e.inputWord.length==e.madeSteps&&(_.include(t.config.finalStates,e.currentState)?e.status="accepted":e.status="not accepted"),e.isNextStepCalculated=!1,e.animatedNextState=!1,e.animatedTransition=!1,e.processedWord+=e.nextChar,e.statusSequence.push(e.currentState),"accepted"!==e.status&&"not accepted"!==e.status&&e.calcNextStep()):(e.animatedTransition=!0,e.animated.transition=e.transition,e.goneTransitions.push(e.transition))},e.calcNextStep=function(){return e.isNextStepCalculated=!0,e.status="step",e.nextChar=e.inputWord[e.madeSteps],e.transition=_.filter(t.config.transitions,function(t){return void 0===e.nextChar?void(e.status="not accepted"):t.fromState==_.last(e.statusSequence)&&t.name==e.nextChar}),_.isEmpty(e.transition)?(e.transition=null,void(e.status="not accepted")):(e.transition=e.transition[0],void(e.nextState=e.transition.toState))},e.stepForward=function(){if(e.simulationPaused||e.pause(),e.simulationStarted){if(!_.include(["step","stopped","accepted","not accepted"],e.status))return void console.log(e.status);_.include(["accepted","not accepted"],e.status)||e.animateNextMove()}else e.prepareSimulation(),e.status="step"},e.stepBackward=function(){e.simulationPaused||e.pause(),_.include(["step","accepted","not accepted"],e.status)&&(e.status="step",e.animatedTransition||e.animatedNextState||0!==e.madeSteps?e.animateLastMove():e.reset())},e.animateLastMove=function(){console.log(e.animatedTransition+" "+e.animatedNextState),e.animatedTransition&&e.animatedNextState?(e.animated.nextState=null,e.animatedNextState=!1):e.animatedTransition?(e.animated.transition=null,e.animatedTransition=!1,e.goneTransitions.pop()):e.calcLastStep()},e.calcLastStep=function(){e.nextChar=e.processedWord.slice(-1),console.log(e.nextChar+" "+e.statusSequence[e.statusSequence.length-2]),e.transition=_.last(e.goneTransitions),console.log(e.transition),_.pullAt(e.goneTransitions,e.goneTransitions.length),e.animatedTransition=!0,e.animated.transition=e.transition;var t=e.currentState;e.currentState=e.transition.fromState,e.nextState=t,e.animated.nextState=e.nextState,e.animatedNextState=!0,e.animated.currentState=e.currentState,e.madeSteps--,e.statusSequence.splice(-1,1),e.processedWord=e.processedWord.slice(0,-1)},e.getNextTransition=function(e,a){for(var n=0;n<t.config.transitions.length;n++){var i=t.config.transitions[n];if(i.fromState==e&&i.name==a)return i}},e.check=function(){var a=!1,n=[];n.push(t.config.startState);for(var i="",r=0,s=null;r<=t.config.inputWord.length&&(i=t.config.inputWord[r],s=e.getNextTransition(_.last(n),i),!_.isEmpty(s));)if(n.push(s.toState),r++,t.config.inputWord.length==r){if(_.include(t.config.finalStates,_.last(n))){a=!0;break}break}return a},e.isPlayable=function(){
return t.config.states.length>=1&&t.config.transitions.length>=1&&null!==t.config.startState&&t.config.finalStates.length>=1},e.playOrPause=function(){e.isPlayable()&&(e.isInPlay=!e.isInPlay,e.isInPlay?(e.simulationPaused=!1,e.play()):e.pause())},t.updateListeners.push(e),e.updateFunction=function(){e.isInputAccepted=e.check()}}function StateDiagramDFA(t,e){"use strict";function a(t,e){var a={x:t.y*e.z,y:-t.x*e.z};return a}function n(t){return t*(180/Math.PI)}function i(t){return t*(Math.PI/180)}function r(t,e){return{x:t.x*e,y:t.y*e}}function s(t){var e=1/Math.sqrt(t.x*t.x+t.y*t.y);return{x:t.x*e,y:t.y*e}}function o(t,e){var a=(t.x*e.x+t.y*e.y)/(Math.sqrt(t.x*t.x+t.y*t.y)*Math.sqrt(e.x*e.x+e.y*e.y)),i=Math.acos(a);return{val:a,rad:i,degree:n(i)}}function c(t,e){var a=t.x*e.x+t.y*e.y,n=t.x*e.y-t.y*e.x;return Math.atan2(n,a)}function d(t,e){var a=n(c(t,e));0>a&&(a+=360);var i=a+g;i>360&&(i-=360);var r=a-g;return 0>r&&(r+=360),{angle:a,lowerAngle:r,upperAngle:i}}var l=this;l.preventStateDragging=!1,l.inAddTransition=!1,l.selectedState=null,l.preventSvgOuterClick=!1,l.selectedTransition=null,l.showStateMenu=!1,l.showTransitionMenu=!1,l.selectedStateName="selectedForTransition",l.snapping=!0,l.settings={stateRadius:25,finalStateRadius:29,selected:!1};var u=40,f=18;l.stateSelfReferenceNumber=Math.sin(45*(Math.PI/180))*l.settings.stateRadius,l.existsDrawnTransition=function(e,a){for(var n=!1,i=0;i<t.config.drawnTransitions.length;i++){var r=t.config.drawnTransitions[i];r.fromState==e&&r.toState==a&&(n=!0)}return n},l.getDrawnTransition=function(e,a){for(var n=0;n<t.config.drawnTransitions.length;n++){var i=t.config.drawnTransitions[n];if(i.fromState==e&&i.toState==a)return i}},l.clearSvgContent=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgTransitions.html(""),l.svgStates.html(""),t.config.drawnTransitions=[],l.svg.attr("transform","translate("+t.defaultConfig.diagramm.x+","+t.defaultConfig.diagramm.y+") scale("+t.defaultConfig.diagramm.scale+")"),m.scale(t.defaultConfig.diagramm.scale),m.translate([t.defaultConfig.diagramm.x,t.defaultConfig.diagramm.y])},l.zoomMax=2.5,l.zoomMin=.5,l.zoomValue=.1,l.zoomIn=function(){t.config.diagramm.scale=t.config.diagramm.scale+l.zoomValue>l.zoomMax?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale+l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomOut=function(){t.config.diagramm.scale=t.config.diagramm.scale-l.zoomValue<=l.zoomMin?t.config.diagramm.scale:Math.floor(100*(t.config.diagramm.scale-l.zoomValue))/100,l.updateZoomBehaviour()},l.zoomTo=function(e){console.log("zoomtedto"),t.config.diagramm.scale=e/100,t.safeApply(),l.updateZoomBehaviour()},l.updateZoomBehaviour=function(){t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")"),m.scale(t.config.diagramm.scale),m.translate([t.config.diagramm.x,t.config.diagramm.y])},l.zoomFitWindow=function(){var e,a=[],n=[],i=0,r=0,s=0,o=0,c=0,d=0,u=l.svgOuter.style("width").replace("px",""),f=l.svgOuter.style("height").replace("px","");if(t.config.diagramm.scale=1,t.config.states.length>0){for(e=0;e<t.config.states.length;e++)a[e]=t.config.states[e].x;for(e=0;e<t.config.states.length;e++)n[e]=t.config.states[e].y;for(i=_.min(a),r=_.max(a),s=_.min(n),o=_.max(n);r-i+150>u/t.config.diagramm.scale||o-s+200>f/t.config.diagramm.scale;)t.config.diagramm.scale-=.01;t.safeApply(),c=(f/t.config.diagramm.scale-(o-s))/2,d=(u/t.config.diagramm.scale-(r-i))/2,t.config.diagramm.x=-(i*t.config.diagramm.scale)+d*t.config.diagramm.scale,t.config.diagramm.y=-(s*t.config.diagramm.scale)+c*t.config.diagramm.scale,l.updateZoomBehaviour()}else l.scaleAndTranslateToDefault()},l.scaleAndTranslateToDefault=function(){t.config.diagramm.scale=t.defaultConfig.diagramm.scale,t.config.diagramm.x=t.defaultConfig.diagramm.x,t.config.diagramm.y=t.defaultConfig.diagramm.y,t.safeApply(),l.updateZoomBehaviour()};var m=d3.behavior.zoom().scaleExtent([l.zoomMin,l.zoomMax]).on("zoom",function(){var e=d3.event.button||d3.event.ctrlKey;if(e&&d3.event.stopImmediatePropagation(),3!==d3.event.sourceEvent.which){var a=Math.floor(100*d3.event.scale)/100;t.config.diagramm.scale=a,t.config.diagramm.x=d3.event.translate[0],t.config.diagramm.y=d3.event.translate[1],t.safeApply(),l.svg.attr("transform","translate("+t.config.diagramm.x+","+t.config.diagramm.y+") scale("+t.config.diagramm.scale+")")}else console.log("rightclick!")});l.svgOuter=d3.select(e).call(m).on("dblclick.zoom",null).on("contextmenu",function(){d3.event.preventDefault()}),l.addSvgOuterClickListener=function(){l.svgOuter.on("click",function(){l.preventSvgOuterClick?l.preventSvgOuterClick=!1:(l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply())})},l.addSvgOuterClickListener(),l.svgGrid=l.svgOuter.append("g").attr("id","grid"),l.svg=l.svgOuter.append("g").attr("id","svg-items"),l.svgTransitions=l.svg.append("g").attr("id","transitions"),l.svgStates=l.svg.append("g").attr("id","states"),l.gridSpace=100,l.gridSnapDistance=20,l.isGrid=!0,t.$watch("[statediagram.isGrid , config.diagramm]",function(){l.drawGrid()},!0),l.drawGrid=function(){if(l.isGrid){l.svgGrid.html("");var e,a=l.svgOuter.style("width").replace("px",""),n=l.svgOuter.style("height").replace("px",""),i=1*t.config.diagramm.scale*.5,r=t.config.diagramm.x%(l.gridSpace*t.config.diagramm.scale),s=t.config.diagramm.y%(l.gridSpace*t.config.diagramm.scale);for(e=r;a>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line xgrid-line").attr("x1",e).attr("y1",0).attr("x2",e).attr("y2",n);for(e=s;n>e;e+=l.gridSpace*t.config.diagramm.scale)l.svgGrid.append("line").attr("stroke-width",i).attr("class","grid-line ygrid-line").attr("x1",0).attr("y1",e).attr("x2",a).attr("y2",e)}else l.svgGrid.html("")},l.defs=l.svg.append("svg:defs"),l.defs.append("svg:marker").attr("id","marker-end-arrow").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-create").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-animated").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-hover").attr("refX",7.5).attr("refY",3).attr("markerWidth",10).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.defs.append("svg:marker").attr("id","marker-end-arrow-selection").attr("refX",4).attr("refY",3).attr("markerWidth",5).attr("markerHeight",10).attr("orient","auto").append("svg:path").attr("d","M0,0 L0,6 L9,3 z"),l.resetAddActions=function(){l.closeStateMenu(),l.closeTransitionMenu(),l.svgOuter.on("click",null),l.inAddTransition=!1,l.inAddState=!1},l.addState=function(){l.resetAddActions(),l.svgOuter.on("mousemove",function(){l.selectedState.objReference.attr("transform","translate("+(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale)+" "+(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale)+")")}),l.selectedState=t.addStateWithPresets(-1e4,-1e4),l.selectedState.objReference.classed("state-in-creation",!0),l.svgOuter.on("click",function(){l.selectedState.objReference.classed("state-in-creation",!1),l.selectedState.x=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),l.selectedState.y=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),l.selectedState.objReference.attr("transform","translate("+l.selectedState.x+" "+l.selectedState.y+")"),l.svgOuter.on("mousemove",null),l.addSvgOuterClickListener(),l.preventSvgOuterClick=!1,t.safeApply()})},l.addTransition=function(){l.resetAddActions(),l.preventStateDragging=!0,d3.selectAll(".state").on("click",function(){if(l.mouseInState=!0,null===l.selectedState)l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.tmpTransition=l.svgTransitions.append("g").attr("class","transition"),l.tmpTransitionline=l.tmpTransition.append("path").attr("class","transition-line curvedLine in-creation").attr("marker-end","url(#marker-end-arrow-create)").attr("fill","none");else{var e=t.addTransition(l.selectedState.id,parseInt(d3.select(this).attr("object-id")),t.getNextTransitionName(l.selectedState.id));l.toggleState(l.selectedState.id,!1),l.tmpTransition.remove(),l.tmpTransition=null,l.tmpTransitionline=null,l.preventStateDragging=!1,l.addSvgOuterClickListener(),l.svgOuter.on("mousemove",null),d3.selectAll(".state").on("mouseover",null),d3.selectAll(".state").on("mouseleave",null),d3.selectAll(".state").on("click",l.openStateMenu),l.openTransitionMenu(e.id)}}),l.svgOuter.on("mousemove",function(){if(!l.mouseInState&&null!==l.selectedState){var e=(d3.mouse(this)[0]-t.config.diagramm.x)*(1/t.config.diagramm.scale),a=(d3.mouse(this)[1]-t.config.diagramm.y)*(1/t.config.diagramm.scale),n=l.bezierLine([[l.selectedState.x,l.selectedState.y],[e,a]]);l.tmpTransitionline.attr("d",n)}}),d3.selectAll(".state").on("mouseover",function(e){if(l.mouseInState=!0,null!==l.selectedState){var a=t.getStateById(d3.select(this).attr("object-id")),n={};n.fromState=l.selectedState.id,n.toState=a.id;var i=l.tmpTransitionline;if(l.existsDrawnTransition(l.selectedState.fromState,l.selectedState.toState)){var r=l.getDrawnTransition(n.fromState,n.toState);r.names.push(n.name),l.writeTransitionText(r.objReference.select(".transition-text"),r.names)}else if(n.fromState!=n.toState){var s=l.getTransitionDrawConfig(n);if(s.approachTransition){var o=l.getDrawnTransition(n.toState,n.fromState),c=l.getTransitionDrawConfig(o,!0);l.updateTransitionLines(o.objReference,c.path),o.objReference.select(".transition-text").attr("x",c.xText).attr("y",c.yText),l.otherTransition=o}i.attr("d",s.path)}else{var d=t.getArrayStateIdByStateId(n.fromState),u=t.config.states[d].x,f=t.config.states[d].y;i.attr("d",l.selfTransition(u,f))}l.tmpTransitionline.attr("x1",l.selectedState.x).attr("y1",l.selectedState.y).attr("x2",a.x).attr("y2",a.y)}}).on("mouseleave",function(){if(l.mouseInState=!1,null!==l.otherTransition&&void 0!==l.otherTransition){var t=l.getTransitionDrawConfig(l.otherTransition);l.updateTransitionLines(l.otherTransition.objReference,t.path),l.otherTransition.objReference.select(".transition-text").attr("x",t.xText).attr("y",t.yText)}})},l.renameState=function(e,a){var n=t.config.states[t.getArrayStateIdByStateId(e)],i=n.objReference;i.select("text").text(a)},l.removeState=function(e){l.closeStateMenu();var a=t.config.states[t.getArrayStateIdByStateId(e)],n=a.objReference;n.remove()},l.renameTransition=function(t,e,a,n){var i=l.getDrawnTransition(t,e),r=_.find(i.names,{id:a});r.name=n,l.writeTransitionText(i.objReference.select(".transition-text"),i.names)},l.removeTransition=function(e){var a=t.getTransitionById(e),n=l.getDrawnTransition(a.fromState,a.toState),i=l.getTransitionDrawConfig(a);if(l.closeTransitionMenu(),1===n.names.length){if(n.objReference.remove(),_.remove(t.config.drawnTransitions,function(t){return t==n}),i.approachTransition){var r=l.getDrawnTransition(a.toState,a.fromState),s=l.getTransitionDrawConfig(r,!1);l.updateTransitionLines(r.objReference,s.path),r.objReference.select(".transition-text").attr("x",s.xText).attr("y",s.yText),l.otherTransition=r}}else _.remove(n.names,function(t){return t.id==a.id}),l.writeTransitionText(n.objReference.select(".transition-text"),n.names),i=l.getTransitionDrawConfig(a),n.objReference.select(".transition-text").attr("x",i.xText).attr("y",i.yText),console.log(n),l.openTransitionMenu(n.names[n.names.length-1].id)},l.addFinalState=function(e){var a=t.getStateById(e);a.objReference.insert("circle",".state-circle").attr("class","final-state").attr("r",l.settings.finalStateRadius)},l.removeFinalState=function(e){var a=t.getStateById(e);a.objReference.select(".final-state").remove()},l.changeStartState=function(e){if(null!==t.config.startState){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove()}var n=t.getStateById(e);n.objReference.append("line").attr("class","transition-line start-line").attr("x1",0).attr("y1",-75).attr("x2",0).attr("y2",0-l.settings.stateRadius-4).attr("marker-end","url(#marker-end-arrow)")},l.removeStartState=function(e){var a=t.getStateById(t.config.startState);a.objReference.select(".start-line").remove(),t.config.startState=null,t.updateListener()},l.drawState=function(e){var a=t.getStateById(e),n=l.svgStates.append("g").attr("transform","translate("+a.x+" "+a.y+")").attr("class","state state-"+a.id).attr("object-id",a.id);n.append("circle").attr("class","state-circle").attr("r",l.settings.stateRadius),n.append("circle").attr("class","state-circle hover-circle").attr("r",l.settings.stateRadius),n.append("text").text(a.name).attr("class","state-text").attr("dominant-baseline","central").attr("text-anchor","middle");return a.objReference=n,n.on("click",l.openStateMenu).call(l.dragState),n},l.setStateClassAs=function(e,a,n){var i=t.getStateById(e).objReference;i.classed(n,a)},l.setTransitionClassAs=function(e,a,n){var i=t.getTransitionById(e),r=l.getDrawnTransition(i.fromState,i.toState).objReference;r.classed(n,a),a&&"animated-transition"==n?r.select(".transition-line").attr("marker-end","url(#marker-end-arrow-animated)"):r.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.setArrowMarkerTo=function(t,e){""!==e?t.select(".transition-line").attr("marker-end","url(#marker-end-arrow-"+e+")"):t.select(".transition-line").attr("marker-end","url(#marker-end-arrow)")},l.openStateMenu=function(){console.log("open state menu"),l.closeStateMenu(),l.closeTransitionMenu(),t.safeApply(),l.preventSvgOuterClick=!0,l.showStateMenu=!0,l.selectedState=t.getStateById(parseInt(d3.select(this).attr("object-id"))),l.toggleState(l.selectedState.id,!0),l.input={},l.input.state=l.selectedState,l.input.stateName=l.selectedState.name,l.input.startState=t.config.startState==l.selectedState.id,l.input.finalState=t.isStateAFinalState(l.selectedState.id),l.input.ttt="",l.input.tttisopen=!1,t.safeApply(),l.stateMenuListener=[],l.stateMenuListener.push(t.$watch("statediagram.input.startState",function(e,a){e!==a&&(l.input.startState?t.changeStartState(l.input.state.id):l.selectedState.id==t.config.startState&&t.removeStartState())})),l.stateMenuListener.push(t.$watch("statediagram.input.finalState",function(e,a){e!==a&&(l.input.finalState?t.addFinalState(l.input.state.id):t.removeFinalState(l.input.state.id))})),l.stateMenuListener.push(t.$watch("statediagram.input.stateName",function(e,a){if(l.input.tttisopen=!1,e!==a)if(""===e||t.existsStateWithName(e))""===e?(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_TOO_SHORT"):t.existsStateWithName(e,l.input.state.id)&&(l.input.tttisopen=!0,l.input.ttt="STATE_MENU.NAME_ALREADY_EXIST");else{!t.renameState(l.input.state.id,e)}}))},l.closeStateMenu=function(){_.forEach(l.stateMenuListener,function(t,e){t()}),null!==l.selectedState&&l.toggleState(l.selectedState.id,!1),l.stateMenuListener=null,l.showStateMenu=!1,l.input=null},l.toggleState=function(t,e){l.setStateClassAs(t,e,"active"),e===!1&&(l.selectedState=null)},l.dragState=d3.behavior.drag().on("dragstart",function(){l.dragAmount=0,d3.event.sourceEvent.stopPropagation()}).on("drag",function(){if(1==d3.event.sourceEvent.which&&!l.preventStateDragging){l.dragAmount++;var e=d3.event.x,a=d3.event.y;if(l.snapping){var n=e-e%l.gridSpace,i=a-a%l.gridSpace;e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n,a=i):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i-l.gridSnapDistance&&a<i+l.gridSnapDistance?(e=n+l.gridSpace,a=i):e>n-l.gridSnapDistance&&e<n+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance?(e=n,a=i+l.gridSpace):e>n+l.gridSpace-l.gridSnapDistance&&e<n+l.gridSpace+l.gridSnapDistance&&a>i+l.gridSpace-l.gridSnapDistance&&a<i+l.gridSpace+l.gridSnapDistance&&(e=n+l.gridSpace,a=i+l.gridSpace)}if(l.dragAmount>1){d3.select(this).attr("transform","translate("+e+" "+a+")");var r=d3.select(this).attr("object-id"),s=t.getStateById(r);s.x=e,s.y=a,l.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"))}}}).on("dragend",function(){l.dragAmount>1&&t.safeApply()}),l.selfTransition=function(t,e){return l.bezierLine([[t-l.stateSelfReferenceNumber,e-l.stateSelfReferenceNumber],[t-l.stateSelfReferenceNumber-u,e-l.stateSelfReferenceNumber-f],[t-l.stateSelfReferenceNumber-u,e+l.stateSelfReferenceNumber+f],[t-l.stateSelfReferenceNumber,e+l.stateSelfReferenceNumber]])};var g=30;l.bezierLine=d3.svg.line().x(function(t){return t[0]}).y(function(t){return t[1]}).interpolate("basis"),l.getTransitionDrawConfig=function(e,n){var c=3,u={};u.approachTransition=n||l.existsDrawnTransition(e.toState,e.fromState);var f,m=t.getStateById(e.fromState),g=t.getStateById(e.toState),S=t.isStateAFinalState(e.toState),p=m.x,v=m.y,h=g.x,T=g.y,x={x:h-p,y:T-v},y=Math.sqrt(x.x*x.x+x.y*x.y),A=l.settings.stateRadius/y;f=S?(l.settings.stateRadius+c+5)/y:(l.settings.stateRadius+c)/y,u.xStart=p+A*x.x,u.yStart=v+A*x.y,u.xEnd=h-f*x.x,u.yEnd=T-f*x.y,u.xDiff=h-p,u.yDiff=T-v,u.xMid=(p+h)/2,u.yMid=(v+T)/2,u.distance=Math.sqrt(u.xDiff*u.xDiff+u.yDiff*u.yDiff);var w,I,M={x:u.xMid-u.xStart,y:u.yMid-u.yStart,z:0},D={x:0,y:0,z:1},b={x:1,y:0,z:0};if(w=20,I=a(M,D),I=s(I),I=r(I,w),u.approachTransition){var C=d({x:u.xStart-p,y:u.yStart-v},{x:l.settings.stateRadius,y:0}),L=d({x:u.xEnd-h,y:u.yEnd-T},{x:l.settings.stateRadius,y:0});u.xStart=p+l.settings.stateRadius*Math.cos(i(C.upperAngle)),u.yStart=v-l.settings.stateRadius*Math.sin(i(C.upperAngle)),u.xEnd=h+l.settings.stateRadius*Math.cos(i(L.lowerAngle)),u.yEnd=T-l.settings.stateRadius*Math.sin(i(L.lowerAngle))}w=35,I=a(M,D),I=s(I),I=r(I,w),u.xMidCurv=I.x+u.xMid,u.yMidCurv=I.y+u.yMid;var k,R=(l.existsDrawnTransition(m.id,g.id),l.getDrawnTransition(m.id,g.id));k=R?R.names.length:1;var E,N,_=o(M,b),B=_.degree;B>90&&(B=90-B%90);var O=Math.pow(B/90,.5);E=u.approachTransition?40+8*k*O:12+8*k*O,N=a(M,D),N=s(N),N=r(N,E),u.xText=N.x+u.xMid,u.yText=N.y+u.yMid;var F=[];return F=u.approachTransition?[[u.xStart,u.yStart],[u.xMidCurv,u.yMidCurv],[u.xEnd,u.yEnd]]:[[u.xStart,u.yStart],[u.xEnd,u.yEnd]],u.path=l.bezierLine(F),u},l.writeTransitionText=function(e,a){e.selectAll("*").remove();for(var n=0;n<a.length;n++)null!==t.simulator.animated.transition&&a[n].id===t.simulator.animated.transition.id?e.append("tspan").attr("transition-id",a[n].id).text(a[n].name).classed("animated-transition-text",!0):e.append("tspan").attr("transition-id",a[n].id).text(a[n].name),n<a.length-1&&e.append("tspan").text(" | ")},l.drawTransition=function(e){var a=t.getTransitionById(e);if(!l.existsDrawnTransition(a.fromState,a.toState)){var n=l.svgTransitions.append("g").attr("class","transition"),i=(n.append("path").attr("class","transition-line-selection").attr("fill","none").attr("marker-end","url(#marker-end-arrow-selection)"),n.append("path").attr("class","transition-line").attr("fill","none").attr("marker-end","url(#marker-end-arrow)"),n.append("path").attr("class","transition-line-click").attr("stroke-width",20).attr("stroke","transparent").attr("fill","none"),n.append("path").attr("class","transition-line-hover").attr("fill","none").attr("marker-end","url(#marker-end-arrow-hover)"),n.append("text").attr("class","transition-text").attr("dominant-baseline","central").attr("fill","black"));if(a.fromState!=a.toState){var r=l.getTransitionDrawConfig(a);if(r.approachTransition){var s=l.getDrawnTransition(a.toState,a.fromState),o=l.getTransitionDrawConfig(s,!0);l.updateTransitionLines(s.objReference,o.path),s.objReference.select(".transition-text").attr("x",o.xText).attr("y",o.yText)}i.attr("class","transition-text").attr("x",r.xText).attr("y",r.yText),l.updateTransitionLines(n,r.path)}else{var c=t.getArrayStateIdByStateId(a.fromState),d=t.config.states[c].x,u=t.config.states[c].y;l.updateTransitionLines(n,l.selfTransition(d,u)),i.attr("x",d-l.settings.stateRadius-50).attr("y",u)}return n.attr("object-id",t.config.drawnTransitions.push({fromState:a.fromState,toState:a.toState,names:[{id:a.id,name:a.name}],objReference:n})-1),l.writeTransitionText(i,l.getDrawnTransition(a.fromState,a.toState).names),n.attr("from-state-id",a.fromState).attr("to-state-id",a.toState).on("click",l.openTransitionMenu).on("mouseover",function(){d3.select(this).select(".transition-line-hover").attr("style","opacity:0.6")}).on("mouseleave",function(){d3.select(this).select(".transition-line-hover").attr("style","")}),n}var f=l.getDrawnTransition(a.fromState,a.toState);f.names.push({id:a.id,name:a.name}),l.writeTransitionText(f.objReference.select(".transition-text"),l.getDrawnTransition(a.fromState,a.toState).names);var m=l.getTransitionDrawConfig(a);f.objReference.select(".transition-text").attr("x",m.xText).attr("y",m.yText)},l.updateTransitionLines=function(t,e){t.select(".transition-line").attr("d",e),t.select(".transition-line-selection").attr("d",e),t.select(".transition-line-hover").attr("d",e),t.select(".transition-line-click").attr("d",e)},l.openTransitionMenu=function(e){l.closeStateMenu(),l.closeTransitionMenu(),l.preventSvgOuterClick=!0,l.showTransitionMenu=!0;var a,n;if(void 0===e)a=d3.select(this).attr("from-state-id"),n=d3.select(this).attr("to-state-id"),l.selectedTransition=l.getDrawnTransition(a,n);else{var i=t.getTransitionById(e);a=i.fromState,n=i.toState,l.selectedTransition=l.getDrawnTransition(a,n)}l.selectedTransition.objReference.classed("active",!0),l.input={},l.input.fromState=t.getStateById(a),l.input.toState=t.getStateById(n),l.input.transitions=[],_.forEach(l.selectedTransition.names,function(t,a){var n={};n=cloneObject(t),void 0!==e?t.id==e&&(n.isFocus=!0):l.selectedTransition.names.length-1===a&&(n.isFocus=!0),n.ttt="",n.tttisopen=!1,l.input.transitions.push(n)}),l.transitionMenuListener=[];for(var r=0;r<l.input.transitions.length;r++)l.transitionMenuListener.push(t.$watchCollection("statediagram.input.transitions['"+r+"']",function(e,i){e.name!==i.name&&(e.tttisopen=!1,""===e.name||t.existsTransition(a,n,e.name)?""===e.name?(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_TOO_SHORT"):t.existsTransition(a,n,e.name,e.id)&&(e.tttisopen=!0,e.ttt="TRANS_MENU.NAME_ALREAD_EXISTS"):t.renameTransition(e.id,e.name),console.log(t.existsTransition(a,n,e.name,e.id)))}));t.safeApply()},l.closeTransitionMenu=function(){_.forEach(l.transitionMenuListener,function(t,e){t()}),l.showTransitionMenu=!1,null!==l.selectedTransition&&(l.selectedTransition.objReference.classed("active",!1),l.selectedTransition=null)},l.updateTransitionsAfterStateDrag=function(e){t.config.states[t.getArrayStateIdByStateId(e)].name;_.forEach(t.config.drawnTransitions,function(a,n){if(a.fromState==e||a.toState==e){var i=a.objReference,r=i.select("text");if(a.fromState!=a.toState){var s=l.getTransitionDrawConfig(a);l.updateTransitionLines(i,s.path),r.attr("x",s.xText).attr("y",s.yText)}else{var o=a.fromState,c=t.config.states[t.getArrayStateIdByStateId(o)].x,d=t.config.states[t.getArrayStateIdByStateId(o)].y;l.updateTransitionLines(i,l.selfTransition(c,d)),r.attr("x",c-l.settings.stateRadius-50).attr("y",d)}}})},t.$watch("simulator.animated.currentState",function(e,a){e!==a&&(console.log("CURRENTSTATE:oldValue "+a+" newvalue "+e),console.log("status"+t.simulator.status),null!==a&&(l.setStateClassAs(a,!1,"animated-currentstate-svg"),l.setStateClassAs(a,!1,"animated-accepted-svg"),l.setStateClassAs(a,!1,"animated-not-accepted-svg")),null!==e&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"):l.setStateClassAs(e,!0,"animated-currentstate-svg")))}),t.$watch("simulator.animated.transition",function(t,e){t!==e&&(null!==e&&(l.setTransitionClassAs(e.id,!1,"animated-transition"),d3.selectAll("[transition-id='"+e.id+"'").classed("animated-transition-text",!1)),null!==t&&(l.setTransitionClassAs(t.id,!0,"animated-transition"),console.log(t),d3.selectAll("[transition-id='"+t.id+"'").classed("animated-transition-text",!0)))}),t.$watch("simulator.animated.nextState",function(t,e){t!==e&&(console.log("NEXTSTATE: oldValue "+e+" newvalue "+t),null!==e&&l.setStateClassAs(e,!1,"animated-nextstate-svg"),null!==t&&l.setStateClassAs(t,!0,"animated-nextstate-svg"))}),t.$watch("simulator.status",function(e,a){e!==a&&("accepted"===t.simulator.status?l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-accepted-svg"):"not accepted"===t.simulator.status&&l.setStateClassAs(t.simulator.animated.currentState,!0,"animated-not-accepted-svg"))})}function StatetransitionfunctionDFA(t){"use strict";var e=this;e.functionData={},e.functionData.states=[],e.functionData.startState="",e.functionData.finalStates="",e.functionData.transitions="",e.functionData.statetransitionfunction=[],t.updateListeners.push(e),e.updateFunction=function(){var a,n="",i="",r="",s="";e.functionData.transitions=t.config.alphabet,e.functionData.states=[],_.forEach(t.config.states,function(a,i){n="";var r="";null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id&&(r="selected"),n+=a.id==t.simulator.animated.currentState&&"accepted"===t.simulator.status?'<span class="animated-accepted '+r+'">':a.id==t.simulator.animated.currentState&&"not accepted"===t.simulator.status?'<span class="animated-not-accepted '+r+'">':a.id==t.simulator.animated.currentState?'<span class="animated-currentstate '+r+'">':'<span class="'+r+'">',n+=a.name,n+="</span>",i<t.config.states.length-1&&(n+=", "),e.functionData.states.push(n)}),e.functionData.statetransitionfunction=[],_.forEach(t.config.states,function(a,n){_.forEach(t.config.transitions,function(n,r){if(n.fromState===a.id){var s=n,o=!1;null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{id:n.id})&&(o=!0);var c=!1;t.simulator.animated.transition&&t.simulator.animated.transition.id===s.id&&(c=!0),i=c||o?'(<span class=" '+(c?"animated-transition":"")+" "+(o?"selected":"")+'">':"(<span>",i+=t.getStateById(s.fromState).name+", ",i+=s.name+", ",i+=t.getStateById(s.toState).name+"</span>)",e.functionData.statetransitionfunction.push(i)}})}),a=t.getStateById(t.config.startState),void 0!==a&&(r+='<span class="">'+a.name+"</span>"),e.functionData.startState=r,_.forEach(t.config.finalStates,function(e,a){e=t.getStateById(e),s=e.name,a<t.config.finalStates.length-1&&(s+=", ")}),e.functionData.finalStates=s},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.status",function(t,a){t!==a&&e.updateFunction()})}function TableDFA(t){var e=this;e.states=[],t.updateListeners.push(e),e.updateFunction=function(){e.states=[],e.alphabet=[];t.config;_.forEach(t.config.alphabet,function(a,n){var i="";null!==t.statediagram.selectedTransition&&void 0!==_.find(t.statediagram.selectedTransition.names,{name:a})&&(i="selected");var r;r=t.simulator.animated.transition&&t.simulator.animated.transition.name===a?'<span class="animated-transition '+i+'">'+a+"</span>":'<span class="'+i+'">'+a+"</span>",e.alphabet.push(r)}),_.forEach(t.config.states,function(a,n){var i={};i.id=a.id;var r="";if((null!==t.statediagram.selectedState&&t.statediagram.selectedState.id==a.id||null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.fromState===a.id)&&(r="selected"),t.simulator.animated.currentState==a.id){var s="";s="accepted"===t.simulator.status?"animated-accepted":"not accepted"===t.simulator.status?"animated-not-accepted":"animated-currentstate",i.name='<span class="'+s+" "+r+'">'+a.name+"</span>"}else i.name='<span class="'+r+'">'+a.name+"</span>";t.isStateAFinalState(a.id)?i.finalState=!0:i.finalState=!1,t.config.startState===a.id?i.startState=!0:i.startState=!1,i.trans=[],_.forEach(t.config.alphabet,function(e,n){var r=null;_.forEach(t.config.transitions,function(t,n){t.fromState===a.id&&t.name===e&&(r=t)});var s={};if(s.alphabet=e,null!==r){var o=t.getStateById(r.toState),c="";null!==t.statediagram.selectedTransition&&t.statediagram.selectedTransition.toState===o.id&&(c="selected"),t.simulator.animated.nextState==o.id&&r.name==t.simulator.animated.transition.name?s.State='<span class="animated-nextstate '+c+'">'+o.name+"</span>":s.State='<span class="'+c+'">'+o.name+"</span>"}else s.State="";i.trans.push(s)}),e.states.push(i)})},t.$watch("simulator.animated.currentState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.transition",function(t,a){t!==a&&e.updateFunction()}),t.$watch("simulator.animated.nextState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedState",function(t,a){t!==a&&e.updateFunction()}),t.$watch("statediagram.selectedTransition",function(t,a){t!==a&&e.updateFunction()})}
//Simulator for the simulation of the automata
function SimulationDFA($scope) {
    "use strict";
    var self = this;

    //saves if the animation is in playmode
    self.isInPlay = false;
    //if the simulation loops (start at the end again)
    self.loopSimulation = true;
    //time between the steps
    self.stepTimeOut = 1500;
    //Time between loops when the animation restarts
    self.loopTimeOut = 2000;
    //if the simulation is paused
    self.simulationPaused = false;
    //simulationsettings
    self.simulationSettings = true;

    //
    self.currentState = null;
    self.nextState = null;
    self.transition = null;


    //
    self.isInputAccepted = false;

    self.settings = function () {
        self.simulationSettings = !self.simulationSettings;
    };
    self.animated = {
        currentState: null,
        transition: null,
        nextState: null
    };

    /**
     * Should reset the simulation
     */
    self.reset = function () {
        //reset animation
        self.animated = {
            currentState: null,
            transition: null,
            nextState: null
        };
        //stack of the gone transitions
        self.goneTransitions = [];
        //Animation Settings
        //saves the currentStateId -> for animating
        self.currentState = $scope.config.startState;
        //saves the nextTransition for animating
        self.transition = null;
        //saves if the transition is animated
        self.animatedTransition = false;
        //saves the nextState for animating
        self.nextState = null;
        //saves if the nextState is animated
        self.animatedNextState = false;
        //saves if we already calculated the next step
        self.isNextStepCalculated = false;
        //saves if the simulationStarted
        self.simulationStarted = false;

        //Simulation Settings
        //saves the States we gone through
        self.statusSequence = [$scope.config.startState];
        //saves the steps we made T.
        self.madeSteps = 0;
        //the word we want to check
        self.inputWord = $scope.config.inputWord;
        //the word we already checked
        self.processedWord = '';
        //the char we checked at the step
        self.nextChar = '';
        //the status is stopped at when resetted
        self.status = 'stopped';
    };

    /**
     * Pause the simulation
     */
    self.pause = function () {
        if (!self.simulationPaused) {
            self.simulationPaused = true;
            self.isInPlay = false;
        }
    };

    /**
     * Stops the simulation
     */
    self.stop = function () {
        self.pause();
        self.reset();
    };

    /**
     * Play the simulation
     */
    self.play = function () {

        //if the simulation is paused then return
        if (!self.simulationPaused) {
            //start and prepare for the play
            if (!self.simulationStarted) {
                self.prepareSimulation();
            } else {
                //loop through the steps
                if (self.isNextStepCalculated || ((self.status != 'accepted') && (self.status != 'not accepted'))) {
                    self.animateNextMove();
                    $scope.safeApply(function () {});
                    if (self.isNextStepCalculated || ((self.status != 'accepted') && (self.status != 'not accepted'))) {
                        setTimeout(self.play, self.stepTimeOut);
                    }
                }
                //end the animation & reset it if loop through is activated the animation loop throuh play
                if (!self.isNextStepCalculated && self.status == 'accepted') {
                    if (self.loopSimulation) {
                        setTimeout(self.play, self.loopTimeOut);
                        //finish the Animation
                    } else {
                        self.isInPlay = false;
                    }
                    self.simulationStarted = false;
                    $scope.safeApply(function () {});
                }
            }
        } else {
            return;
        }
    };

    /**
     * Prepare the simulation ( set startSettings)
     */
    self.prepareSimulation = function () {
        //The simulation always resets the parameters at the start -> it also sets the inputWord
        self.reset();
        self.simulationStarted = true;
        self.animated.currentState = _.last(self.statusSequence);

        $scope.safeApply();
        setTimeout(self.play, self.loopTimeOut);
    };

    /**
     * animate the next Move (a step has more than three moves)
     */
    self.animateNextMove = function () {
        if (!self.isNextStepCalculated) {
            self.calcNextStep();
        }

        //First: Paint the transition & wait
        if (!self.animatedTransition) {
            self.animatedTransition = true;
            self.animated.transition = self.transition;
            self.goneTransitions.push(self.transition);

            //Second: Paint the nextstate & wait
        } else if (!self.animatedNextState && self.animatedTransition) {
            self.animatedNextState = true;
            self.animated.nextState = self.nextState;


            //Third: clear transition & currentStatecolor and set currentState = nexsttate and wait
        } else if (self.animatedTransition && self.animatedNextState) {
            self.animated.transition = null;
            self.animated.nextState = null;
            self.animated.currentState = self.nextState;

            self.currentState = self.nextState;
            //after the step was animated it adds a step to the madeSteps
            self.madeSteps++;
            //if the nextState is the finalState
            if (self.inputWord.length == self.madeSteps) {
                if (_.include($scope.config.finalStates, self.currentState)) {
                    self.status = 'accepted';
                } else {
                    self.status = 'not accepted';
                }
            }



            //Reset the step & start the next step
            self.isNextStepCalculated = false;
            self.animatedNextState = false;
            self.animatedTransition = false;
            self.processedWord += self.nextChar;

            //push the currentState to the statusSequence
            self.statusSequence.push(self.currentState);

            //check if there is a next transition
            if (self.status !== "accepted" && self.status !== "not accepted")
                self.calcNextStep();
        }

    };

    /**
     * calcs the next step
     */
    self.calcNextStep = function () {
        self.isNextStepCalculated = true;
        self.status = 'step';
        self.nextChar = self.inputWord[self.madeSteps];

        //get the next transition
        self.transition = _.filter($scope.config.transitions, function (transition) {
            //if there is no next char then the word is not accepted
            if (self.nextChar === undefined) {
                self.status = 'not accepted';
                return;
            }
            //get the nextState
            return transition.fromState == _.last(self.statusSequence) && transition.name == self.nextChar;
        });
        //if there is no next transition, then the word is not accepted
        if (_.isEmpty(self.transition)) {
            self.transition = null;
            self.status = 'not accepted';
            return;
        }
        //save transition and nextState for the animation
        self.transition = self.transition[0];
        self.nextState = self.transition.toState;
    };

    /**
     * pause the simulation and then stepForward steps to the nextAnimation ( not a whole step)
     */
    self.stepForward = function () {
        if (!self.simulationPaused) {
            self.pause();
        }
        if (!self.simulationStarted) {
            self.prepareSimulation();
            self.status = 'step';
            // return if automat is not running
        } else if (!(_.include(['step', 'stopped', 'accepted', 'not accepted'], self.status))) {
            //TODO:DEBUG
            console.log(self.status);
            return;
        } else if (!_.include(['accepted', 'not accepted'], self.status)) {
            self.animateNextMove();
        }
    };


    /**
     * pause the simulation and then steps back to the lastAnimation ( not a whole step)
     * @return {[type]} [description]
     */
    self.stepBackward = function () {
        if (!self.simulationPaused) {
            self.pause();
        }
        // return if automat is not running
        if (!(_.include(['step', 'accepted', 'not accepted'], self.status))) {
            //TODO:DEBUG
            return;
        }
        self.status = 'step';

        // Reset if no more undoing is impossible n-> not right at the moment
        if (!self.animatedTransition && !self.animatedNextState && self.madeSteps === 0) {
            self.reset();
        } else {
            // Decrease count and remove last element from statusSequence
            self.animateLastMove();
        }
    };

    /**
     * animates the last move if there is no lastmove, then calcLastStep
     * @return {[type]} [description]
     */
    self.animateLastMove = function () {
        console.log(self.animatedTransition + " " + self.animatedNextState);
        if (self.animatedTransition && self.animatedNextState) {
            self.animated.nextState = null;
            self.animatedNextState = false;
        } else if (self.animatedTransition) {
            self.animated.transition = null;
            self.animatedTransition = false;
            self.goneTransitions.pop();
        } else {
            self.calcLastStep();
        }

    };

    /**
     * calc the last step
     */
    self.calcLastStep = function () {
        self.nextChar = self.processedWord.slice(-1);
        console.log(self.nextChar + " " + self.statusSequence[self.statusSequence.length - 2]);

        //get the gone way back
        self.transition = _.last(self.goneTransitions);
        console.log(self.transition);
        _.pullAt(self.goneTransitions, self.goneTransitions.length);
        //First: Paint the transition & wait
        self.animatedTransition = true;
        self.animated.transition = self.transition;
        var tmp = self.currentState;
        self.currentState = self.transition.fromState;
        self.nextState = tmp;
        self.animated.nextState = self.nextState;
        //Second: Paint the nextstate & wait
        self.animatedNextState = true;

        self.animated.currentState = self.currentState;
        self.madeSteps--;
        self.statusSequence.splice(-1, 1);
        self.processedWord = self.processedWord.slice(0, -1);
    };

    self.getNextTransition = function (fromState, transitonName) {
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var transition = $scope.config.transitions[i];
            if (transition.fromState == fromState && transition.name == transitonName) {
                return transition;
            }
        }
        return undefined;
    };
    /**
     * checks if a word is accepted from the automata
     * @return {Boolean} [description]
     */
    self.check = function () {
        //init needed variables
        var accepted = false;
        var statusSequence = [];
        statusSequence.push($scope.config.startState);
        var nextChar = '';
        var madeSteps = 0;
        var transition = null;

        while (madeSteps <= $scope.config.inputWord.length) {
            nextChar = $scope.config.inputWord[madeSteps];
            //get the next transition
            transition = self.getNextTransition(_.last(statusSequence), nextChar);
            //if there is no next transition, then the word is not accepted
            if (_.isEmpty(transition)) {
                break;
            }
            //push the new State to the sequence
            statusSequence.push(transition.toState);
            madeSteps++;
            //if outmadeSteps is equal to the length of the inputWord 
            //and our currenState is a finalState then the inputWord is accepted, if not its not accepted
            if ($scope.config.inputWord.length == madeSteps) {
                if (_.include($scope.config.finalStates, _.last(statusSequence))) {
                    accepted = true;
                    break;
                } else {
                    break;
                }
            }
        }
        return accepted;
    };


    //BUTTONS NEED DIRECTIVES
    /**
     *  Checks if the automata is playable ( has min. 1 states and 1 transition and automat has a start and a finalstate)
     * @return {Boolean} [description]
     */
    self.isPlayable = function () {
        return $scope.config.states.length >= 1 && $scope.config.transitions.length >= 1 && $scope.config.startState !== null && $scope.config.finalStates.length >= 1;
    };

    /**
     * [playOrPause description]
     * @return {[type]} [description]
     */
    self.playOrPause = function () {
        //the automat needs to be playable
        if (self.isPlayable()) {
            //change the icon and the state to Play or Pause
            self.isInPlay = !self.isInPlay;
            if (self.isInPlay) {
                self.simulationPaused = false;
                self.play();
            } else {
                self.pause();
            }

        } else {
            //$scope.dbug.debugDanger("Kein Automat vorhanden!");
        }

    };

    $scope.updateListeners.push(self);
    self.updateFunction = function () {
        self.isInputAccepted = self.check();
    };




}
//statediagram for the svg diagramm
function StateDiagramDFA($scope, svgSelector) {
    "use strict";

    var self = this;

    self.preventStateDragging = false;
    self.inAddTransition = false;
    self.selectedState = null;

    //prevents call from the svouterclicklistener
    self.preventSvgOuterClick = false;
    self.selectedTransition = null;
    self.showStateMenu = false;
    self.showTransitionMenu = false;
    self.selectedStateName = "selectedForTransition";
    //user can snap the states to the grid -> toggles snapping
    self.snapping = true;

    //statediagram settings
    self.settings = {
        stateRadius: 25,
        finalStateRadius: 29,
        selected: false
    };
    //is for the selfReference
    var stretchX = 40;
    var stretchY = 18;

    //for the selfReference transition
    self.stateSelfReferenceNumber = Math.sin(45 * (Math.PI / 180)) * self.settings.stateRadius;

    /**
     * Check if transition already drawn
     * @param   {number}  fromState 
     * @param   {number}  toState   
     * @returns {boolean}
     */
    self.existsDrawnTransition = function (fromState, toState) {

        var tmp = false;
        for (var i = 0; i < $scope.config.drawnTransitions.length; i++) {
            var transition = $scope.config.drawnTransitions[i];
            if (transition.fromState == fromState && transition.toState == toState) {
                tmp = true;
            }
        }
        return tmp;
    };

    /**
     * Get a drawn Transition
     * @param   {number} fromState 
     * @param   {number} toState   
     * @returns {object} 
     */
    self.getDrawnTransition = function (fromState, toState) {
        for (var i = 0; i < $scope.config.drawnTransitions.length; i++) {
            var transition = $scope.config.drawnTransitions[i];
            if (transition.fromState == fromState && transition.toState == toState) {
                return transition;
            }
        }
        return undefined;
    };

    /**
     * Clears the svgContent, resets scale and translate and delete drawnTransitionContent
     */
    self.clearSvgContent = function () {
        //first close Menus
        self.closeStateMenu();
        self.closeTransitionMenu();
        //Clear the content of the svg
        self.svgTransitions.html("");
        self.svgStates.html("");
        $scope.config.drawnTransitions = [];
        //change the scale and the translate to the defaultConfit
        self.svg.attr("transform", "translate(" + $scope.defaultConfig.diagramm.x + "," + $scope.defaultConfig.diagramm.y + ")" + " scale(" + $scope.defaultConfig.diagramm.scale + ")");
        svgOuterZoomAndDrag.scale($scope.defaultConfig.diagramm.scale);
        svgOuterZoomAndDrag.translate([$scope.defaultConfig.diagramm.x, $scope.defaultConfig.diagramm.y]);

    };

    /****ZOOMHANDLER START***/
    //amount the user can zoom out
    self.zoomMax = 2.5;
    //amount the user can zoom in
    self.zoomMin = 0.5;
    self.zoomValue = 0.1;

    self.zoomIn = function () {
        $scope.config.diagramm.scale = ($scope.config.diagramm.scale + self.zoomValue) > self.zoomMax ? $scope.config.diagramm.scale : Math.floor(($scope.config.diagramm.scale + self.zoomValue) * 100) / 100;
        self.updateZoomBehaviour();
    };
    self.zoomOut = function () {

        $scope.config.diagramm.scale = ($scope.config.diagramm.scale - self.zoomValue) <= self.zoomMin ? $scope.config.diagramm.scale : Math.floor(($scope.config.diagramm.scale - self.zoomValue) * 100) / 100;
        self.updateZoomBehaviour();

    };

    /**
     * This method zooms the svg to a specific scale
     * @param {number} value the zoom value
     */
    self.zoomTo = function (value) {
        console.log("zoomtedto");
        $scope.config.diagramm.scale = value / 100;
        $scope.safeApply();
        self.updateZoomBehaviour();
    };

    /**
     * This method updates the d3 zoombehaviour (fixes weird bugs)
     */
    self.updateZoomBehaviour = function () {
        $scope.safeApply();
        self.svg.attr("transform", "translate(" + $scope.config.diagramm.x + "," + $scope.config.diagramm.y + ")" + " scale(" + $scope.config.diagramm.scale + ")");
        svgOuterZoomAndDrag.scale($scope.config.diagramm.scale);
        svgOuterZoomAndDrag.translate([$scope.config.diagramm.x, $scope.config.diagramm.y]);
    };

    /**
     * This method zooms the svg to a calculated scale, so the complete svg fits in the window
     */
    self.zoomFitWindow = function () {
        var stateXCoor = [];
        var stateYCoor = [];
        var minX = 0;
        var maxX = 0;
        var minY = 0;
        var maxY = 0;
        var topShifting = 0;
        var leftShifting = 0;
        var i;
        var obj;
        var width = self.svgOuter.style("width").replace("px", "");
        var height = self.svgOuter.style("height").replace("px", "");

        /*
         * set the diagrammscale on 100%. We got the advantage, that the method also zoom in, if the automaton doesn't fit the window. 
         * But the method doesn't really zoom in. It sets the scale on 100% an then zoom out.
         */
        $scope.config.diagramm.scale = 1.0;

        /**
         * check if there exist at least one state. If the diagram is empty, there is nothing to fit the window.
         * The state with the lowest x- and y-coordinate defines the minimum-x- and minimum-y-coordinate from the automaton.
         * The state with the highest x- and y-coordinate defines the maximum-x- and maximum-y-coordiante from the automaten
         */

        if ($scope.config.states.length > 0) {
            for (i = 0; i < $scope.config.states.length; i++) {
                stateXCoor[i] = $scope.config.states[i].x;
            }

            for (i = 0; i < $scope.config.states.length; i++) {
                stateYCoor[i] = $scope.config.states[i].y;
            }
            minX = _.min(stateXCoor);
            maxX = _.max(stateXCoor);
            minY = _.min(stateYCoor);
            maxY = _.max(stateYCoor);

            /* 
             * While the size of the automaton is bigger than the diagram, zoom out. 
             * We work with the width and the height from the diagram proportional to the scale.
             */
            while (((maxX - minX + 150) > (width / $scope.config.diagramm.scale)) || ((maxY - minY + 200) > (height / $scope.config.diagramm.scale))) {
                $scope.config.diagramm.scale -= 0.01;
            }
            $scope.safeApply();

            //Calculation of a topshifting and a leftshifting, so the automaton is centered in the diagram.
            topShifting = (((height / $scope.config.diagramm.scale) - (maxY - minY)) / 2);
            leftShifting = (((width / $scope.config.diagramm.scale) - (maxX - minX)) / 2);

            //set the diagram-x and -y values and update the diagram.
            $scope.config.diagramm.x = -(minX * $scope.config.diagramm.scale) + (leftShifting * $scope.config.diagramm.scale);
            $scope.config.diagramm.y = -(minY * $scope.config.diagramm.scale) + (topShifting * $scope.config.diagramm.scale);
            self.updateZoomBehaviour();
        } else {
            self.scaleAndTranslateToDefault();
        }
    };

    /**
     * Scale and Translate the Svg to the default Value
     */
    self.scaleAndTranslateToDefault = function () {
        $scope.config.diagramm.scale = $scope.defaultConfig.diagramm.scale;
        $scope.config.diagramm.x = $scope.defaultConfig.diagramm.x;
        $scope.config.diagramm.y = $scope.defaultConfig.diagramm.y;
        $scope.safeApply();
        self.updateZoomBehaviour();
    };

    //the svgouterzoom and drag listener
    var svgOuterZoomAndDrag = d3.behavior
        .zoom()
        .scaleExtent([self.zoomMin, self.zoomMax])
        .on("zoom", function () {
            var stop = d3.event.button || d3.event.ctrlKey;
            if (stop) d3.event.stopImmediatePropagation(); // stop zoom
            //dont translate on right click (3)
            if (d3.event.sourceEvent.which !== 3) {
                var newScale = Math.floor(d3.event.scale * 100) / 100;

                $scope.config.diagramm.scale = newScale;
                $scope.config.diagramm.x = d3.event.translate[0];
                $scope.config.diagramm.y = d3.event.translate[1];
                $scope.safeApply();
                self.svg.attr("transform", "translate(" + $scope.config.diagramm.x + "," + $scope.config.diagramm.y + ")" + " scale(" + $scope.config.diagramm.scale + ")");
            } else {
                console.log("rightclick!");
            }
        });


    //prevents the normal rightclickcontextmenu and add zoom
    self.svgOuter = d3.select(svgSelector)
        .call(svgOuterZoomAndDrag)
        //prevents doubleclick zoom
        .on("dblclick.zoom", null)
        //adds our custom context menu on rightclick
        .on("contextmenu", function () {
            d3.event.preventDefault();
        });

    /**
     * Click Listener when clicking on the outer svg =(not clicking on state or transition)
     */
    self.addSvgOuterClickListener = function () {
        self.svgOuter.on("click", function () {
            if (!self.preventSvgOuterClick) {
                self.closeStateMenu();
                self.closeTransitionMenu();
                $scope.safeApply();
            } else {
                //remove clickbool
                self.preventSvgOuterClick = false;
            }
        });
    };

    //add at the start
    self.addSvgOuterClickListener();

    //the html element where we put the svgGrid into
    self.svgGrid = self.svgOuter.append("g").attr("id", "grid");

    //inner svg
    self.svg = self.svgOuter
        .append("g")
        .attr("id", "svg-items");


    //first draw the transitions -> nodes are in front of them if they overlap
    self.svgTransitions = self.svg.append("g").attr("id", "transitions");
    self.svgStates = self.svg.append("g").attr("id", "states");



    //the space between each SnappingPoint 1:(0,0)->2:(0+gridSpace,0+gridSpace)
    self.gridSpace = 100;
    //the distance when the state is snapped to the next SnappingPoint (Rectangle form)
    self.gridSnapDistance = 20;
    //is Grid drawn
    self.isGrid = true;

    //watcher for the grid when changed -> updateGrid
    $scope.$watch('[statediagram.isGrid , config.diagramm]', function () {
        self.drawGrid();
    }, true);

    /**
     * Draw the Grid
     */
    self.drawGrid = function () {
        if (self.isGrid) {
            //clear grid
            self.svgGrid.html("");
            var width = self.svgOuter.style("width").replace("px", "");
            var height = self.svgOuter.style("height").replace("px", "");
            var thickness = 1 * $scope.config.diagramm.scale * 0.5;
            var xOffset = ($scope.config.diagramm.x % (self.gridSpace * $scope.config.diagramm.scale));
            var yOffset = ($scope.config.diagramm.y % (self.gridSpace * $scope.config.diagramm.scale));
            var i;
            //xGrid
            for (i = xOffset; i < width; i += self.gridSpace * $scope.config.diagramm.scale) {
                self.svgGrid
                    .append("line")
                    .attr("stroke-width", thickness)
                    .attr("class", "grid-line xgrid-line")
                    .attr("x1", i)
                    .attr("y1", 0)
                    .attr("x2", i)
                    .attr("y2", height);
            }
            //yGrid
            for (i = yOffset; i < height; i += self.gridSpace * $scope.config.diagramm.scale) {
                self.svgGrid
                    .append("line")
                    .attr("stroke-width", thickness)
                    .attr("class", "grid-line ygrid-line")
                    .attr("x1", 0)
                    .attr("y1", i)
                    .attr("x2", width)
                    .attr("y2", i);
            }
        } else {
            //undraw Grid
            self.svgGrid.html("");
        }
    };


    //DEFS
    self.defs = self.svg.append('svg:defs');
    //Marker-Arrow ( for the transitions)
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-create')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-animated')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-hover')
        .attr('refX', 7.5)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');
    self.defs.append('svg:marker')
        .attr('id', 'marker-end-arrow-selection')
        .attr('refX', 4)
        .attr('refY', 3)
        .attr('markerWidth', 5)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,0 L0,6 L9,3 z');


    /**
     * Reset all the AddListeners
     */
    self.resetAddActions = function () {
        self.closeStateMenu();
        self.closeTransitionMenu();
        self.svgOuter.on("click", null);
        self.inAddTransition = false;
        self.inAddState = false;
    };

    /**
     * AddState -> creates a new state when clicked on the button with visual feedback
     */
    self.addState = function () {
        self.resetAddActions();
        //add listener that the selectedstate follows the mouse
        self.svgOuter.on("mousemove", function () {
            //move the state (only moved visually not saved)
            self.selectedState.objReference.attr("transform", "translate(" + (((d3.mouse(this)[0]) - $scope.config.diagramm.x) * (1 / $scope.config.diagramm.scale)) + " " +
                (((d3.mouse(this)[1]) - $scope.config.diagramm.y) * (1 / $scope.config.diagramm.scale)) + ")");
        });
        //create a new selectedState in a position not viewable
        self.selectedState = $scope.addStateWithPresets(-10000, -10000);
        //add a class to the state (class has opacity)
        self.selectedState.objReference.classed("state-in-creation", true);
        self.svgOuter.on("click", function () {
            //remove class
            self.selectedState.objReference.classed("state-in-creation", false);
            //update the stateData
            self.selectedState.x = (((d3.mouse(this)[0]) - $scope.config.diagramm.x) * (1 / $scope.config.diagramm.scale));
            self.selectedState.y = (((d3.mouse(this)[1]) - $scope.config.diagramm.y) * (1 / $scope.config.diagramm.scale));
            self.selectedState.objReference.attr("transform", "translate(" + self.selectedState.x + " " + self.selectedState.y + ")");
            //remove mousemove listener
            self.svgOuter.on("mousemove", null);
            //overwrite the click listener
            self.addSvgOuterClickListener();
            self.preventSvgOuterClick = false;
            $scope.safeApply();

        });
    };

    /**
     * Addtransition function for the icon
     */
    self.addTransition = function () {
        self.resetAddActions();
        //prevent dragging during addTransition
        self.preventStateDragging = true;
        //1. FirstClick: select a state and create a tmpLine for visual feedback
        //SecondClick: Create a transition from selectState to the clickedState
        d3.selectAll(".state").on("click", function () {
            self.mouseInState = true;
            //if there is no selected state then select a state
            if (self.selectedState === null) {
                self.selectedState = $scope.getStateById(parseInt(d3.select(this).attr("object-id")));
                self.toggleState(self.selectedState.id, true);

                //create tmpLine
                self.tmpTransition = self.svgTransitions.append("g")
                    .attr("class", "transition");
                //the line itself with the arrow without the path itself
                self.tmpTransitionline = self.tmpTransition.append("path")
                    .attr("class", "transition-line curvedLine in-creation")
                    .attr("marker-end", "url(#marker-end-arrow-create)")
                    .attr("fill", "none");

                //if already selected a state then create transition to the clickedState
            } else {
                var tmpTransition = $scope.addTransition(self.selectedState.id, parseInt(d3.select(this).attr("object-id")), $scope.getNextTransitionName(self.selectedState.id));
                self.toggleState(self.selectedState.id, false);
                self.tmpTransition.remove();
                self.tmpTransition = null;
                self.tmpTransitionline = null;
                self.preventStateDragging = false;
                //update the svgOuter listeners
                self.addSvgOuterClickListener();
                self.svgOuter.on("mousemove", null);
                //update state listeners
                d3.selectAll(".state").on("mouseover", null);
                d3.selectAll(".state").on("mouseleave", null);
                d3.selectAll('.state').on('click', self.openStateMenu);

                //openTransitionMenu
                self.openTransitionMenu(tmpTransition.id);
            }

        });
        //2. if the mouse moves on the svgOuter and not on a state, then update the tmpLine
        self.svgOuter.on("mousemove", function () {
            if (!self.mouseInState && self.selectedState !== null) {
                var x = (((d3.mouse(this)[0]) - $scope.config.diagramm.x) * (1 / $scope.config.diagramm.scale));
                var y = (((d3.mouse(this)[1]) - $scope.config.diagramm.y) * (1 / $scope.config.diagramm.scale));
                var pathLine = self.bezierLine([[self.selectedState.x, self.selectedState.y], [x, y]]);
                self.tmpTransitionline.attr("d", pathLine);
            }
        });

        //3. if the mouse moves on a state then give a visual feedback how the line connects with the state
        d3.selectAll(".state").on("mouseover", function (i) {
            //see 2.
            self.mouseInState = true;
            //we need an other state to connect the line
            if (self.selectedState !== null) {
                var otherState = $scope.getStateById(d3.select(this).attr("object-id"));
                var transition = {};
                transition.fromState = self.selectedState.id;
                transition.toState = otherState.id;
                var line = self.tmpTransitionline;
                if (!self.existsDrawnTransition(self.selectedState.fromState, self.selectedState.toState)) {
                    //the group element
                    //if it is not a self Reference
                    if (transition.fromState != transition.toState) {
                        var drawConfig = self.getTransitionDrawConfig(transition);
                        //if there is a transition in the other direction
                        if (drawConfig.approachTransition) {
                            //other transition in the other direction
                            var otherTrans = self.getDrawnTransition(transition.toState, transition.fromState);
                            var otherDrawConfig = self.getTransitionDrawConfig(otherTrans, true);
                            self.updateTransitionLines(otherTrans.objReference, otherDrawConfig.path);
                            otherTrans.objReference.select(".transition-text")
                                .attr("x", otherDrawConfig.xText)
                                .attr("y", otherDrawConfig.yText);
                            //update the transition text position
                            self.otherTransition = otherTrans;

                        }
                        //get the curve data ( depends if there is a transition in the oposite direction)
                        line.attr("d", drawConfig.path);
                        //if it is a selfreference
                    } else {
                        var stateId = $scope.getArrayStateIdByStateId(transition.fromState);
                        var x = $scope.config.states[stateId].x;
                        var y = $scope.config.states[stateId].y;
                        line.attr("d", self.selfTransition(x, y));
                    }
                    //if there is already a transition with the same fromState and toState then the current
                } else {
                    //add the name to the drawnTransition
                    var drawnTransition = self.getDrawnTransition(transition.fromState, transition.toState);
                    drawnTransition.names.push(transition.name);
                    //drawn the new name to the old transition (svg)
                    self.writeTransitionText(drawnTransition.objReference.select(".transition-text"), drawnTransition.names);


                }
                self.tmpTransitionline.attr("x1", self.selectedState.x)
                    .attr("y1", self.selectedState.y)
                    .attr("x2", otherState.x)
                    .attr("y2", otherState.y);
            }
        }).on("mouseleave", function () {
            self.mouseInState = false;
            //remove the visual feedback from transition going against our tmpLine
            if (self.otherTransition !== null && self.otherTransition !== undefined) {
                var otherDrawConfig = self.getTransitionDrawConfig(self.otherTransition);
                self.updateTransitionLines(self.otherTransition.objReference, otherDrawConfig.path);
                self.otherTransition.objReference.select(".transition-text")
                    .attr("x", (otherDrawConfig.xText))
                    .attr("y", (otherDrawConfig.yText));
            }
        });
    };

    /**
     * Renames the state in the svg after the $scope variable was changed
     * @param  {number} stateId      
     * @param  {String} newStateName          
     */
    self.renameState = function (stateId, newStateName) {
        var state = $scope.config.states[$scope.getArrayStateIdByStateId(stateId)];
        var objReference = state.objReference;
        objReference.select("text").text(newStateName);
    };

    /**
     * Removes the state with the given id
     * @param  {number} stateId 
     */
    self.removeState = function (stateId) {
        self.closeStateMenu();
        var state = $scope.config.states[$scope.getArrayStateIdByStateId(stateId)];
        var objReference = state.objReference;
        objReference.remove();
    };


    /**
     * Renames a transition
     * @param {number} fromState         the fromStateId
     * @param {number} toState           the toStateID
     * @param {number} transitionId      the transitionid
     * @param {char}   newTransitionName the new transitionname
     */
    self.renameTransition = function (fromState, toState, transitionId, newTransitionName) {
        //change it in drawnTransition
        var drawnTransition = self.getDrawnTransition(fromState, toState);
        var drawnTransitionName = _.find(drawnTransition.names, {
            "id": transitionId
        });
        drawnTransitionName.name = newTransitionName;

        //change it on the svg
        self.writeTransitionText(drawnTransition.objReference.select(".transition-text"), drawnTransition.names);
    };


    /**
     * removes a transition from the svg
     * @param   {number}   transitionId
     */
    self.removeTransition = function (transitionId) {
        var tmpTransition = $scope.getTransitionById(transitionId);
        var tmpDrawnTransition = self.getDrawnTransition(tmpTransition.fromState, tmpTransition.toState);
        var drawConfig = self.getTransitionDrawConfig(tmpTransition);
        self.closeTransitionMenu();
        //if its the only transition in the drawn transition -> then remove the drawn transition
        if (tmpDrawnTransition.names.length === 1) {
            tmpDrawnTransition.objReference.remove();
            _.remove($scope.config.drawnTransitions, function (n) {
                return n == tmpDrawnTransition;
            });
            //if there is an approad transition, then draw it with the new drawconfig
            if (drawConfig.approachTransition) {
                //other transition in the other direction
                var otherTrans = self.getDrawnTransition(tmpTransition.toState, tmpTransition.fromState);
                var otherDrawConfig = self.getTransitionDrawConfig(otherTrans, false);
                self.updateTransitionLines(otherTrans.objReference, otherDrawConfig.path);
                otherTrans.objReference.select(".transition-text")
                    .attr("x", otherDrawConfig.xText)
                    .attr("y", otherDrawConfig.yText);
                //update the transition text position
                self.otherTransition = otherTrans;

            }
        }
        //if there are other transitions with the same from- and tostate, then remove the transition from the names and redraw the text
        else {
            _.remove(tmpDrawnTransition.names, function (n) {
                return n.id == tmpTransition.id;
            });
            self.writeTransitionText(tmpDrawnTransition.objReference.select(".transition-text"), tmpDrawnTransition.names);
            drawConfig = self.getTransitionDrawConfig(tmpTransition);
            tmpDrawnTransition.objReference.select(".transition-text")
                .attr("x", drawConfig.xText)
                .attr("y", drawConfig.yText);
            console.log(tmpDrawnTransition);

            self.openTransitionMenu(tmpDrawnTransition.names[tmpDrawnTransition.names.length - 1].id);

        }


    };

    /**
     * Adds a stateId to the final states on the svg (visual feedback)
     * @param {number} stateId
     */
    self.addFinalState = function (stateId) {
        var state = $scope.getStateById(stateId);
        state.objReference.insert("circle", ".state-circle")
            .attr("class", "final-state")
            .attr("r", self.settings.finalStateRadius);

        //TODO: update the transitions to the state

    };

    /**
     * Removes a final state on the svg
     * @param {number} stateId 
     */
    self.removeFinalState = function (stateId) {
        var state = $scope.getStateById(stateId);
        state.objReference.select(".final-state").remove();
        //TODO update the transitions to the state
    };

    /**
     * Changes the StartState to the stateid
     * @param {number} stateId 
     */
    self.changeStartState = function (stateId) {
        //TODO:
        //remove old startState
        if ($scope.config.startState !== null) {
            var state = $scope.getStateById($scope.config.startState);
            state.objReference.select(".start-line").remove();
        }

        var otherState = $scope.getStateById(stateId);
        otherState.objReference.append("line")
            .attr("class", "transition-line start-line")
            .attr("x1", 0)
            .attr("y1", 0 - 75)
            .attr("x2", 0)
            .attr("y2", 0 - self.settings.stateRadius - 4)
            .attr("marker-end", "url(#marker-end-arrow)");
    };

    /**
     * removes the stateId
     * @param {number} stateId
     */
    self.removeStartState = function (stateId) {
        var state = $scope.getStateById($scope.config.startState);
        state.objReference.select(".start-line").remove();
        $scope.config.startState = null;
        $scope.updateListener();
    };

    /**
     * Draws a State 
     * @param  {number} id the stateid
     * @return {Reference}    Returns the reference of the group object
     */
    self.drawState = function (id) {
        var state = $scope.getStateById(id);
        var group = self.svgStates.append("g")
            .attr("transform", "translate(" + state.x + " " + state.y + ")")
            .attr("class", "state " + "state-" + state.id)
            .attr("object-id", state.id); //save the state-id

        var circle = group.append("circle")
            .attr("class", "state-circle")
            .attr("r", self.settings.stateRadius);
        //for outer circle dotted when selected

        var hoverCircle = group.append("circle")
            .attr("class", "state-circle hover-circle")
            .attr("r", self.settings.stateRadius);

        var text = group.append("text")
            .text(state.name)
            .attr("class", "state-text")
            .attr("dominant-baseline", "central")
            .attr("text-anchor", "middle");

        state.objReference = group;
        group.on('click', self.openStateMenu)
            .call(self.dragState);
        return group;
    };

    /**
     * Adds or remove a class to a state ( only the svg state)
     * @param {number} stateId 
     * @param {Boolean} state   
     * @param {String} className  
     */
    self.setStateClassAs = function (stateId, state, className) {
        var objReference = $scope.getStateById(stateId).objReference;
        objReference.classed(className, state);
    };

    /**
     * Sets a transition class to a specific class or removes the specific class
     * @param {number}   transitionId
     * @param {boolean} state        if the class should be added or removed
     * @param {string}  className    the classname
     */
    self.setTransitionClassAs = function (transitionId, state, className) {
        var trans = $scope.getTransitionById(transitionId);
        var objReference = self.getDrawnTransition(trans.fromState, trans.toState).objReference;
        objReference.classed(className, state);
        if (state && className == 'animated-transition') {
            objReference.select(".transition-line").attr("marker-end", "url(#marker-end-arrow-animated)");
        } else {
            objReference.select(".transition-line").attr("marker-end", "url(#marker-end-arrow)");
        }
    };

    /**
     * sets the arrow marker of a transition, cause we couldnt change the color of an arrow marker
     * @param {object} transLine the transitionlineobject
     * @param {string} suffix    which arrow should be changed
     */
    self.setArrowMarkerTo = function (transLine, suffix) {

        if (suffix !== '') {
            transLine.select('.transition-line').attr("marker-end", "url(#marker-end-arrow-" + suffix + ")");
        } else {
            transLine.select('.transition-line').attr("marker-end", "url(#marker-end-arrow)");
        }
    };


    /**
     * Opens the StateMenu
     */
    self.openStateMenu = function () {
        console.log("open state menu");
        self.closeStateMenu();
        self.closeTransitionMenu();
        //fixes weird errors
        $scope.safeApply();

        self.preventSvgOuterClick = true;
        self.showStateMenu = true;
        self.selectedState = $scope.getStateById(parseInt(d3.select(this).attr("object-id")));
        //add new state as selected
        self.toggleState(self.selectedState.id, true);

        //save the state values in the state context as default value
        self.input = {};
        self.input.state = self.selectedState;
        self.input.stateName = self.selectedState.name;
        self.input.startState = $scope.config.startState == self.selectedState.id;
        self.input.finalState = $scope.isStateAFinalState(self.selectedState.id);
        self.input.ttt = "";
        self.input.tttisopen = false;
        $scope.safeApply();
        self.stateMenuListener = [];
        //Menu watcher
        self.stateMenuListener.push($scope.$watch('statediagram.input.startState', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                if (self.input.startState) {
                    $scope.changeStartState(self.input.state.id);
                } else {
                    if (self.selectedState.id == $scope.config.startState)
                        $scope.removeStartState();
                }
            }

        }));
        self.stateMenuListener.push($scope.$watch('statediagram.input.finalState', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                if (self.input.finalState) {
                    $scope.addFinalState(self.input.state.id);
                } else {
                    $scope.removeFinalState(self.input.state.id);
                }

            }

        }));
        self.stateMenuListener.push($scope.$watch('statediagram.input.stateName', function (newValue, oldValue) {
            //if the name got changed but is not empty
            //reset the tooltip
            self.input.tttisopen = false;
            if (newValue !== oldValue) {
                //change if the name doesnt exists and isnt empty
                if (newValue !== "" && !$scope.existsStateWithName(newValue)) {
                    var renameError = !$scope.renameState(self.input.state.id, newValue);
                } else if (newValue === "") {
                    //FEEDBACK
                    self.input.tttisopen = true;
                    self.input.ttt = 'STATE_MENU.NAME_TOO_SHORT';
                } else if ($scope.existsStateWithName(newValue, self.input.state.id)) {
                    self.input.tttisopen = true;
                    self.input.ttt = 'STATE_MENU.NAME_ALREADY_EXIST';
                }
            }
        }));
    };

    /**
     * closes the state menu
     */
    self.closeStateMenu = function () {
        //remove old StateMenuListeners
        _.forEach(self.stateMenuListener, function (value, key) {
            value();
        });
        if (self.selectedState !== null) {
            self.toggleState(self.selectedState.id, false);
        }
        self.stateMenuListener = null;
        self.showStateMenu = false;

        //delete input
        self.input = null;
    };

    /**
     * toggle a state
     * @param {number} stateId 
     * @param {bool}   bool
     */
    self.toggleState = function (stateId, bool) {
        self.setStateClassAs(stateId, bool, "active");
        if (bool === false) {
            self.selectedState = null;
        }

    };


    //Node drag and drop behaviour
    self.dragState = d3.behavior.drag()
        .on("dragstart", function () {
            //stops drag bugs when wanted to click
            self.dragAmount = 0;
            d3.event.sourceEvent.stopPropagation();
        })
        .on("drag", function () {

            if (d3.event.sourceEvent.which == 1) {
                if (!self.preventStateDragging) {
                    self.dragAmount++;

                    var x = d3.event.x;
                    var y = d3.event.y;

                    if (self.snapping) {


                        var snapPointX = x - (x % self.gridSpace);
                        var snapPointY = y - (y % self.gridSpace);

                        //check first snapping Point (top left)
                        if (x > snapPointX - self.gridSnapDistance && x < snapPointX + self.gridSnapDistance && y > snapPointY - self.gridSnapDistance && y < snapPointY + self.gridSnapDistance) {
                            x = snapPointX;
                            y = snapPointY;
                            //second snapping point (top right)
                        } else if (x > snapPointX + self.gridSpace - self.gridSnapDistance && x < snapPointX + self.gridSpace + self.gridSnapDistance && y > snapPointY - self.gridSnapDistance && y < snapPointY + self.gridSnapDistance) {
                            x = snapPointX + self.gridSpace;
                            y = snapPointY;
                            //third snapping point (bot left)
                        } else if (x > snapPointX - self.gridSnapDistance && x < snapPointX + self.gridSnapDistance && y > snapPointY + self.gridSpace - self.gridSnapDistance && y < snapPointY + self.gridSpace + self.gridSnapDistance) {
                            x = snapPointX;
                            y = snapPointY + self.gridSpace;
                            //fourth snapping point (bot right)
                        } else if (x > snapPointX + self.gridSpace - self.gridSnapDistance && x < snapPointX + self.gridSpace + self.gridSnapDistance && y > snapPointY + self.gridSpace - self.gridSnapDistance && y < snapPointY + self.gridSpace + self.gridSnapDistance) {
                            x = snapPointX + self.gridSpace;
                            y = snapPointY + self.gridSpace;
                        }
                    }

                    //on drag isnt allowed workaround for bad drags when wanted to click
                    if (self.dragAmount > 1) {

                        //update the shown node
                        d3.select(this)
                            .attr("transform", "translate(" + x + " " + y + ")");
                        //update the node in the array

                        var stateId = d3.select(this).attr("object-id");
                        var tmpState = $scope.getStateById(stateId);
                        //update the state coordinates in the dataobject
                        tmpState.x = x;
                        tmpState.y = y;

                        //update the transitions after dragging a node
                        self.updateTransitionsAfterStateDrag(d3.select(this).attr("object-id"));
                    }
                }
            }

        }).on("dragend", function () {
            //save the movement
            if (self.dragAmount > 1) {
                $scope.safeApply();
            }
        });


    /**
     * gets the path for a selftransition
     * @param   {number} x
     * @param   {number} y 
     * @returns {String} path of the selftransition
     */
    self.selfTransition = function (x, y) {
        return self.bezierLine([
                [x - self.stateSelfReferenceNumber, y - self.stateSelfReferenceNumber],
                [x - self.stateSelfReferenceNumber - stretchX, y - self.stateSelfReferenceNumber - stretchY],
                [x - self.stateSelfReferenceNumber - stretchX, y + self.stateSelfReferenceNumber + stretchY],
                [x - self.stateSelfReferenceNumber, y + self.stateSelfReferenceNumber]
            ]);
    };

    /**
     * Crossproduct helper function
     * @param   {object}   a vector
     * @param   {object}   b vector
     * @returns {object}   crossproduct vetor 
     */
    function crossPro(a, b) {

        var vecC = {
            x: a.y * b.z,
            y: -a.x * b.z

        };
        return vecC;
    }

    function toDegrees(angle) {
        return angle * (180 / Math.PI);
    }

    function toRadians(angle) {
        return angle * (Math.PI / 180);
    }

    /**
     * expands a vector with a given factor
     * @param   {object} a      vector
     * @param   {number} factor expandfactor
     * @returns {object} expanded vector
     */
    function expandVector(a, factor) {
        return {
            x: a.x * factor,
            y: a.y * factor
        };
    }

    function fixVectorLength(a) {
        var tmp = 1 / Math.sqrt(a.x * a.x + a.y * a.y);
        return {
            x: a.x * tmp,
            y: a.y * tmp

        };
    }

    function AngleBetweenTwoVectors(a, b) {
        var tmp = (a.x * b.x + a.y * b.y) / (Math.sqrt(a.x * a.x + a.y * a.y) * Math.sqrt(b.x * b.x + b.y * b.y));
        var tmp2 = Math.acos(tmp);
        return {
            val: tmp,
            rad: tmp2,
            degree: toDegrees(tmp2)
        };
    }

    function newAngle(a, b) {
        var dot1 = a.x * b.x + a.y * b.y; //dot product
        var dot2 = a.x * b.y - a.y * b.x; //determinant
        return Math.atan2(dot2, dot1); //atan2(y, x) or atan2(sin, cos)
    }

    var degreeConstant = 30;

    function getAngles(a, b) {
        var angle = toDegrees(newAngle(a, b));
        if (angle < 0) {
            angle = angle + 360;
        }

        var upperAngle = angle + degreeConstant;
        if (upperAngle > 360) {
            upperAngle -= 360;
        }
        var lowerAngle = angle - degreeConstant;
        if (lowerAngle < 0) {
            lowerAngle += 360;
        }

        return {
            angle: angle,
            lowerAngle: lowerAngle,
            upperAngle: upperAngle
        };
    }

    //Get the Path from an array -> for the transition
    self.bezierLine = d3.svg.line()
        .x(function (d) {
            return d[0];
        })
        .y(function (d) {
            return d[1];
        })
        .interpolate("basis");

    /**
     * Returns the transitionDrawConfig with all the data like xstart, xend, xtext....
     * @param   {object}  transition    the transitionobj
     * @param   {boolean} forceApproach if we force an approachedtransition ->needed when the transition was writed to the array, or for the addtransition
     * @returns {object}  the drawConfig
     */
    self.getTransitionDrawConfig = function (transition, forceApproach) {
        //the distance the endPoint of the transition is away from the state
        var gapBetweenTransitionLineAndState = 3;
        var obj = {};

        /**1: Check if there is a transition aproach our transition**/
        obj.approachTransition = forceApproach || self.existsDrawnTransition(transition.toState, transition.fromState);

        /****2. Get the xStart,yStart and xEnd,yEnd  and xMid,yMid***/
        //from and to State
        var fromState = $scope.getStateById(transition.fromState);
        var toState = $scope.getStateById(transition.toState);
        var isToStateAFinalState = $scope.isStateAFinalState(transition.toState);
        //the x and y coordinates
        var x1 = fromState.x;
        var y1 = fromState.y;
        var x2 = toState.x;
        var y2 = toState.y;

        var xCurv1,
            yCurv1,
            xCurv2,
            yCurv2;

        //needed for the calculation of the coordinates
        var directionvector = {
            x: x2 - x1,
            y: y2 - y1
        };
        var directionVectorLength = Math.sqrt(directionvector.x * directionvector.x + directionvector.y * directionvector.y);
        var nStart = self.settings.stateRadius / directionVectorLength;
        var nEnd;
        if (isToStateAFinalState) {
            nEnd = (self.settings.stateRadius + gapBetweenTransitionLineAndState + 5) / directionVectorLength;
        } else {
            nEnd = (self.settings.stateRadius + gapBetweenTransitionLineAndState) / directionVectorLength;
        }

        obj.xStart = x1 + nStart * directionvector.x;
        obj.yStart = y1 + nStart * directionvector.y;

        obj.xEnd = x2 - nEnd * directionvector.x;
        obj.yEnd = y2 - nEnd * directionvector.y;
        obj.xDiff = x2 - x1;
        obj.yDiff = y2 - y1;
        obj.xMid = (x1 + x2) / 2;
        obj.yMid = (y1 + y2) / 2;
        obj.distance = Math.sqrt(obj.xDiff * obj.xDiff + obj.yDiff * obj.yDiff);
        /**3: Calc the CurvedPoint**/
        //BETTER ONLY CALC WHEN obj.approachTransition = true;
        var vecA = {
            x: obj.xMid - obj.xStart,
            y: obj.yMid - obj.yStart,
            z: 0
        };

        var vecB = {
            x: 0,
            y: 0,
            z: 1
        };


        var vecX = {
            x: 1,
            y: 0,
            z: 0
        };



        var stretchValue, movingPoint;
        //OLD:stretchValue = (70 * (1 / obj.distance * 1.1) * 1.4);
        stretchValue = 20;

        movingPoint = crossPro(vecA, vecB);
        movingPoint = fixVectorLength(movingPoint);

        movingPoint = expandVector(movingPoint, stretchValue);

        /**4:Calc the curvestart and end if there is and approach transition**/
        if (obj.approachTransition) {

            var xStart = getAngles({
                x: obj.xStart - x1,
                y: obj.yStart - y1
            }, {
                x: self.settings.stateRadius,
                y: 0
            });

            var xEnd = getAngles({
                x: obj.xEnd - x2,
                y: obj.yEnd - y2
            }, {
                x: self.settings.stateRadius,
                y: 0
            });

            obj.xStart = x1 + (self.settings.stateRadius * Math.cos(toRadians(xStart.upperAngle)));
            obj.yStart = y1 - (self.settings.stateRadius * Math.sin(toRadians(xStart.upperAngle)));

            obj.xEnd = x2 + (self.settings.stateRadius * Math.cos(toRadians(xEnd.lowerAngle)));
            obj.yEnd = y2 - (self.settings.stateRadius * Math.sin(toRadians(xEnd.lowerAngle)));
        }

        //OLD:stretchValue = (70 * (1 / obj.distance * 1.1) * 1.4);
        stretchValue = 35;

        movingPoint = crossPro(vecA, vecB);
        movingPoint = fixVectorLength(movingPoint);
        movingPoint = expandVector(movingPoint, stretchValue);
        obj.xMidCurv = movingPoint.x + obj.xMid;
        obj.yMidCurv = movingPoint.y + obj.yMid;


        /**5:Calc the textposition**/
        var existsDrawnTrans = self.existsDrawnTransition(fromState.id, toState.id);
        var drawnTrans = self.getDrawnTransition(fromState.id, toState.id);
        var transNamesLength;
        if (drawnTrans) {
            transNamesLength = drawnTrans.names.length;
        } else {
            transNamesLength = 1;
        }
        var angleAAndX = AngleBetweenTwoVectors(vecA, vecX);

        var textStretchValue, textPoint;
        var textAngle = angleAAndX.degree;
        if (textAngle > 90) {
            textAngle = 90 - (textAngle % 90);
        }
        var x = Math.pow((textAngle / 90), 1 / 2);

        if (obj.approachTransition) {
            textStretchValue = (40 + (8 * transNamesLength) * x);
        } else {
            textStretchValue = (12 + (transNamesLength * 8) * x);
        }


        textPoint = crossPro(vecA, vecB);
        textPoint = fixVectorLength(textPoint);
        textPoint = expandVector(textPoint, textStretchValue);

        obj.xText = textPoint.x + obj.xMid;
        obj.yText = textPoint.y + obj.yMid;


        /**6:Calc the path**/
        var array = [];
        if (obj.approachTransition) {
            array = [
                [obj.xStart, obj.yStart],
                [obj.xMidCurv, obj.yMidCurv],
                [obj.xEnd, obj.yEnd]
            ];
        } else {
            array = [
                [obj.xStart, obj.yStart],
                [obj.xEnd, obj.yEnd]
            ];
        }
        obj.path = self.bezierLine(array);
        return obj;
    };

    /**
     * Adds the transition names to the text of a transition
     * @param {object} textObj the transition textObjReference
     * @param {array}  names   the names array of the transition
     */
    self.writeTransitionText = function (textObj, names) {
        textObj.selectAll("*").remove();
        for (var i = 0; i < names.length; i++) {
            //fix when creating new transition when in animation
            if ($scope.simulator.animated.transition !== null && names[i].id === $scope.simulator.animated.transition.id) {
                textObj.append('tspan').attr('transition-id', names[i].id).text(names[i].name).classed("animated-transition-text", true);
            } else {
                textObj.append('tspan').attr('transition-id', names[i].id).text(names[i].name);
            }

            if (i < names.length - 1)
                textObj.append('tspan').text(' | ');
        }


    };

    /**
     * Draw a Transition
     * @param  {number} id 
     * @return {object}  Retruns the reference of the group object
     */
    self.drawTransition = function (transitionId) {
        var transition = $scope.getTransitionById(transitionId);
        //if there is not a transition with the same from and toState
        if (!self.existsDrawnTransition(transition.fromState, transition.toState)) {
            //the group element
            var group = self.svgTransitions.append("g")
                .attr("class", "transition"),
                //the line itself with the arrow
                lineSelection = group.append("path")
                .attr("class", "transition-line-selection")
                .attr("fill", "none")
                .attr("marker-end", "url(#marker-end-arrow-selection)"),
                line = group.append("path")
                .attr("class", "transition-line")
                .attr("fill", "none")
                .attr("marker-end", "url(#marker-end-arrow)"),

                lineClickArea = group.append("path")
                .attr("class", "transition-line-click")
                .attr("stroke-width", 20)
                .attr("stroke", "transparent")
                .attr("fill", "none"),
                lineHover = group.append("path")
                .attr("class", "transition-line-hover")
                .attr("fill", "none")
                .attr("marker-end", "url(#marker-end-arrow-hover)"),
                //the text of the transition
                text = group.append("text")
                .attr("class", "transition-text")
                .attr("dominant-baseline", "central")
                .attr("fill", "black");
            //if it is not a self Reference
            if (transition.fromState != transition.toState) {
                var drawConfig = self.getTransitionDrawConfig(transition);
                //if there is an approached transition update the approached transition
                if (drawConfig.approachTransition) {
                    //other transition in the other direction
                    var otherTrans = self.getDrawnTransition(transition.toState, transition.fromState);
                    var otherTransdrawConfig = self.getTransitionDrawConfig(otherTrans, true);
                    self.updateTransitionLines(otherTrans.objReference, otherTransdrawConfig.path);
                    //update the transition text position
                    otherTrans.objReference.select(".transition-text")
                        .attr("x", (otherTransdrawConfig.xText))
                        .attr("y", (otherTransdrawConfig.yText));
                }
                //draw the text
                text.attr("class", "transition-text")
                    .attr("x", (drawConfig.xText))
                    .attr("y", (drawConfig.yText));
                self.updateTransitionLines(group, drawConfig.path);

                //if it is a selfreference
            } else {
                var stateId = $scope.getArrayStateIdByStateId(transition.fromState);
                var x = $scope.config.states[stateId].x;
                var y = $scope.config.states[stateId].y;

                self.updateTransitionLines(group, self.selfTransition(x, y));
                text.attr("x", x - self.settings.stateRadius - 50)
                    .attr("y", y);
            }
            //add the drawnTransition
            group.attr("object-id", $scope.config.drawnTransitions.push({
                fromState: transition.fromState,
                toState: transition.toState,
                names: [{
                    "id": transition.id,
                    "name": transition.name
                }],
                objReference: group
            }) - 1);
            self.writeTransitionText(text, self.getDrawnTransition(transition.fromState, transition.toState).names);
            group.attr("from-state-id", transition.fromState)
                .attr("to-state-id", transition.toState)
                .on('click', self.openTransitionMenu)
                .on("mouseover", function () {
                    d3.select(this).select('.transition-line-hover').attr("style", "opacity:0.6");
                }).on("mouseleave", function () {
                    d3.select(this).select('.transition-line-hover').attr("style", "");
                });
            return group;
            //if there is already a transition with the same fromState and toState then the current
        } else {
            //add the name to the drawnTransition
            var drawnTransition = self.getDrawnTransition(transition.fromState, transition.toState);
            drawnTransition.names.push({
                "id": transition.id,
                "name": transition.name
            });
            //drawn the new name to the old transition (svg)
            self.writeTransitionText(drawnTransition.objReference.select('.transition-text'), self.getDrawnTransition(transition.fromState, transition.toState).names);
            var drawConfigNew = self.getTransitionDrawConfig(transition);
            drawnTransition.objReference.select('.transition-text')
                .attr("x", (drawConfigNew.xText))
                .attr("y", (drawConfigNew.yText));

        }
    };

    /**
     * helper function updates all the transition lines
     * @param {object}   transitionobjReference
     * @param {string}   path                   
     */
    self.updateTransitionLines = function (transitionobjReference, path) {
        transitionobjReference.select(".transition-line").attr("d", path);
        transitionobjReference.select(".transition-line-selection").attr("d", path);
        transitionobjReference.select(".transition-line-hover").attr("d", path);
        transitionobjReference.select(".transition-line-click").attr("d", path);
    };

    /**
     * opens the transitionmenu
     * @param {number} transitionId when there is a transitionId we open the transitionmenu with the given id
     */
    self.openTransitionMenu = function (transitionId) {
        self.closeStateMenu();
        self.closeTransitionMenu();
        self.preventSvgOuterClick = true;
        self.showTransitionMenu = true;

        var fromState, toState;
        if (transitionId === undefined) {
            fromState = d3.select(this).attr('from-state-id');
            toState = d3.select(this).attr('to-state-id');
            self.selectedTransition = self.getDrawnTransition(fromState, toState);
        } else {
            var tmpTransition = $scope.getTransitionById(transitionId);
            fromState = tmpTransition.fromState;
            toState = tmpTransition.toState;
            self.selectedTransition = self.getDrawnTransition(fromState, toState);
        }

        self.selectedTransition.objReference.classed("active", true);

        self.input = {};
        self.input.fromState = $scope.getStateById(fromState);
        self.input.toState = $scope.getStateById(toState);
        self.input.transitions = [];


        _.forEach(self.selectedTransition.names, function (value, key) {
            var tmpObject = {};
            tmpObject = cloneObject(value);

            if (transitionId !== undefined) {
                if (value.id == transitionId) {
                    tmpObject.isFocus = true;
                }
            } else if (self.selectedTransition.names.length - 1 === key) {
                tmpObject.isFocus = true;

            }
            //add other variables
            tmpObject.ttt = "";
            tmpObject.tttisopen = false;
            self.input.transitions.push(tmpObject);
        });

        self.transitionMenuListener = [];

        /*jshint -W083 */
        for (var i = 0; i < self.input.transitions.length; i++) {
            self.transitionMenuListener.push($scope.$watchCollection("statediagram.input.transitions['" + i + "']", function (newValue, oldValue) {
                if (newValue.name !== oldValue.name) {
                    newValue.tttisopen = false;
                    if (newValue.name !== "" && !$scope.existsTransition(fromState, toState, newValue.name)) {
                        $scope.renameTransition(newValue.id, newValue.name);
                    } else if (newValue.name === "") {
                        newValue.tttisopen = true;
                        newValue.ttt = 'TRANS_MENU.NAME_TOO_SHORT';
                    } else if ($scope.existsTransition(fromState, toState, newValue.name, newValue.id)) {
                        newValue.tttisopen = true;
                        newValue.ttt = 'TRANS_MENU.NAME_ALREAD_EXISTS';
                    }
                    console.log(($scope.existsTransition(fromState, toState, newValue.name, newValue.id)));
                }
            }));
        }


        $scope.safeApply();

    };

    /**
     * closes the transitionmenu
     */
    self.closeTransitionMenu = function () {
        _.forEach(self.transitionMenuListener, function (value, key) {
            value();
        });
        self.showTransitionMenu = false;
        if (self.selectedTransition !== null) {
            self.selectedTransition.objReference.classed("active", false);
            self.selectedTransition = null;

        }
    };

    /**
     * Update the transitions in the svg after moving a state
     * @param  {number} stateId Moved stateId
     */
    self.updateTransitionsAfterStateDrag = function (stateId) {
        var stateName = $scope.config.states[$scope.getArrayStateIdByStateId(stateId)].name;
        _.forEach($scope.config.drawnTransitions, function (n, key) {
            if (n.fromState == stateId || n.toState == stateId) {
                //if its not a selfreference
                var obj = n.objReference,
                    transitionText = obj.select("text");
                if (n.fromState != n.toState) {
                    var drawConfig = self.getTransitionDrawConfig(n);
                    //if there is a transition in the other direction
                    self.updateTransitionLines(obj, drawConfig.path);
                    transitionText.attr("x", drawConfig.xText).attr("y", drawConfig.yText);
                } else {
                    var moveStateId = n.fromState;
                    var x = $scope.config.states[$scope.getArrayStateIdByStateId(moveStateId)].x;
                    var y = $scope.config.states[$scope.getArrayStateIdByStateId(moveStateId)].y;
                    //update Transistion with self reference
                    self.updateTransitionLines(obj, self.selfTransition(x, y));
                    transitionText.attr("x", x - self.settings.stateRadius - 50).attr("y", y);
                }
            }
        });
    };

    /**************
     **SIMULATION**
     *************/


    $scope.$watch('simulator.animated.currentState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            console.log("CURRENTSTATE:oldValue " + oldValue + " newvalue " + newValue);
            console.log("status" + $scope.simulator.status);
            if (oldValue !== null) {
                self.setStateClassAs(oldValue, false, "animated-currentstate-svg");
                self.setStateClassAs(oldValue, false, "animated-accepted-svg");
                self.setStateClassAs(oldValue, false, "animated-not-accepted-svg");

            }
            if (newValue !== null) {
                if ($scope.simulator.status === "accepted") {
                    self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-accepted-svg");
                } else if ($scope.simulator.status === "not accepted") {
                    self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-not-accepted-svg");
                } else {
                    self.setStateClassAs(newValue, true, "animated-currentstate-svg");
                }
            }
        }
    });

    $scope.$watch('simulator.animated.transition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            if (oldValue !== null) {
                self.setTransitionClassAs(oldValue.id, false, "animated-transition");
                d3.selectAll("[transition-id='" + oldValue.id + "'").classed("animated-transition-text", false);
                //remove transitionname animation
            }
            if (newValue !== null) {
                self.setTransitionClassAs(newValue.id, true, "animated-transition");
                console.log(newValue);
                d3.selectAll("[transition-id='" + newValue.id + "'").classed("animated-transition-text", true);
                //animate transitionname
            }
        }
    });

    $scope.$watch('simulator.animated.nextState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            console.log("NEXTSTATE: oldValue " + oldValue + " newvalue " + newValue);
            if (oldValue !== null) {
                self.setStateClassAs(oldValue, false, "animated-nextstate-svg");
            }
            if (newValue !== null) {
                self.setStateClassAs(newValue, true, "animated-nextstate-svg");
            }
        }
    });
    $scope.$watch('simulator.status', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            if ($scope.simulator.status === "accepted") {
                self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-accepted-svg");
            } else if ($scope.simulator.status === "not accepted") {
                self.setStateClassAs($scope.simulator.animated.currentState, true, "animated-not-accepted-svg");
            }
        }

    });
}
function StatetransitionfunctionDFA($scope) {
    "use strict";

    var self = this;
    self.functionData = {};
    self.functionData.states = [];
    self.functionData.startState = '';
    self.functionData.finalStates = '';
    self.functionData.transitions = '';
    self.functionData.statetransitionfunction = [];
    //ADD Listener
    $scope.updateListeners.push(self);


    self.updateFunction = function () {
        var arrayAlphabet = [];
        var stringAlphabet = '';
        var stringStates = '';
        var stringStateTransitions = '';
        var stringAllStateTransitions = '';
        var stringStartState = '';
        var startState;
        var stringFinalStates = '';
        var finalState;
        var i;

        self.functionData.transitions = $scope.config.alphabet;



        //Update of States
        self.functionData.states = [];
        _.forEach($scope.config.states, function (state, key) {
            stringStates = '';
            var selectedClass = '';
            if ($scope.statediagram.selectedState !== null && $scope.statediagram.selectedState.id == state.id) {
                selectedClass = "selected";
            }
            if (state.id == $scope.simulator.animated.currentState && $scope.simulator.status === "accepted") {
                stringStates += '<span class="animated-accepted ' + selectedClass + '">';
            } else if (state.id == $scope.simulator.animated.currentState && $scope.simulator.status === "not accepted") {
                stringStates += '<span class="animated-not-accepted ' + selectedClass + '">';
            } else if (state.id == $scope.simulator.animated.currentState) {
                stringStates += '<span class="animated-currentstate ' + selectedClass + '">';
            } else {
                stringStates += '<span class="' + selectedClass + '">';
            }

            stringStates += state.name;
            stringStates += '</span>';
            if (key < $scope.config.states.length - 1) {
                stringStates = stringStates + ', ';
            }
            self.functionData.states.push(stringStates);
        });



        //Update of statetransitionfunction
        self.functionData.statetransitionfunction = [];
        //we go through every state and check if there is a transition and then we save them in the statetransitionfunction array
        _.forEach($scope.config.states, function (state, keyOuter) {
            _.forEach($scope.config.transitions, function (transition, key) {

                if (transition.fromState === state.id) {
                    var stateTransition = transition;
                    var selectedTransition = false;
                    if ($scope.statediagram.selectedTransition !== null && _.find($scope.statediagram.selectedTransition.names, {
                            id: transition.id
                        }) !== undefined) {
                        selectedTransition = true;
                    }
                    var animatedCurrentState = false;
                    if ($scope.simulator.animated.transition && $scope.simulator.animated.transition.id === stateTransition.id) {
                        animatedCurrentState = true;
                    }
                    if (animatedCurrentState || selectedTransition) {
                        stringStateTransitions = '(<span class=" ' + (animatedCurrentState ? 'animated-transition' : '') + ' ' + (selectedTransition ? 'selected' : '') + '">';
                    } else {
                        stringStateTransitions = '(<span>';
                    }
                    stringStateTransitions += $scope.getStateById(stateTransition.fromState).name + ', ';
                    stringStateTransitions += stateTransition.name + ', ';
                    stringStateTransitions += $scope.getStateById(stateTransition.toState).name + '</span>)';

                    self.functionData.statetransitionfunction.push(stringStateTransitions);
                }
            });
        });


        //Update of Startstate
        startState = $scope.getStateById($scope.config.startState);
        if (startState !== undefined) {
            stringStartState += '<span class="">' + startState.name + '</span>';
        }

        self.functionData.startState = stringStartState;

        //Update of Finalstates
        _.forEach($scope.config.finalStates, function (finalState, key) {
            finalState = $scope.getStateById(finalState);
            stringFinalStates = finalState.name;
            if (key < $scope.config.finalStates.length - 1) {
                stringFinalStates += ', ';
            }
        });

        self.functionData.finalStates = stringFinalStates;

    };


    /**************
     **SIMULATION**
     *************/

    $scope.$watch('simulator.animated.currentState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('simulator.animated.transition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedTransition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });
    $scope.$watch('simulator.status', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });
}
//TableDFA
function TableDFA($scope) {
    var self = this;
    self.states = [];
    $scope.updateListeners.push(self);


    self.updateFunction = function () {
        self.states = [];
        self.alphabet = [];
        var dfa = $scope.config;



        var alphabetCounter;

        //prepare alphabet
        _.forEach($scope.config.alphabet, function (character, key) {
            var selectedTrans = "";
            if ($scope.statediagram.selectedTransition !== null && _.find($scope.statediagram.selectedTransition.names, {
                    name: character
                }) !== undefined) {
                selectedTrans = "selected";
            }

            var tmp;
            if ($scope.simulator.animated.transition && $scope.simulator.animated.transition.name === character) {
                tmp = '<span class="animated-transition ' + selectedTrans + '">' + character + '</span>';
            } else {
                tmp = '<span class="' + selectedTrans + '">' + character + '</span>';
            }
            self.alphabet.push(tmp);
        });

        // iterates over all States
        _.forEach($scope.config.states, function (state, key) {


            var tmpObject = {};
            tmpObject.id = state.id;
            // marks the current active state at the simulation in the table
            var selectedClass = "";
            if (($scope.statediagram.selectedState !== null && $scope.statediagram.selectedState.id == state.id) || ($scope.statediagram.selectedTransition !== null && $scope.statediagram.selectedTransition.fromState === state.id)) {
                selectedClass = "selected";
            }
            if ($scope.simulator.animated.currentState == state.id) {
                var animatedClass = "";
                if ($scope.simulator.status === "accepted") {
                    animatedClass = "animated-accepted";
                } else if ($scope.simulator.status === "not accepted") {
                    animatedClass = "animated-not-accepted";
                } else {
                    animatedClass = "animated-currentstate";
                }

                tmpObject.name = '<span class="' + animatedClass + ' ' + selectedClass + '">' + state.name + '</span>';
            } else {
                tmpObject.name = '<span class="' + selectedClass + '">' + state.name + '</span>';
            }

            if ($scope.isStateAFinalState(state.id))
                tmpObject.finalState = true;
            else
                tmpObject.finalState = false;

            if ($scope.config.startState === state.id)
                tmpObject.startState = true;
            else
                tmpObject.startState = false;

            tmpObject.trans = [];


            // iterates over all aplphabet 
            _.forEach($scope.config.alphabet, function (character, key) {
                var foundTransition = null;

                // iterates over the available transitions and saves found transitions
                _.forEach($scope.config.transitions, function (transition, key) {
                    if (transition.fromState === state.id && transition.name === character) {
                        foundTransition = transition;
                    }
                });

                var trans = {};
                trans.alphabet = character;

                // saves the found Transition in "Trans.State"
                if (foundTransition !== null) {
                    var tmpToState = $scope.getStateById(foundTransition.toState);
                    var selectedTrans = "";
                    if ($scope.statediagram.selectedTransition !== null && $scope.statediagram.selectedTransition.toState === tmpToState.id) {
                        selectedTrans = "selected";
                    }
                    if ($scope.simulator.animated.nextState == tmpToState.id && foundTransition.name == $scope.simulator.animated.transition.name) {
                        trans.State = '<span class="animated-nextstate ' + selectedTrans + '">' + tmpToState.name + '</span>';
                    } else {
                        trans.State = '<span class="' + selectedTrans + '">' + tmpToState.name + '</span>';
                    }
                } else {
                    trans.State = "";
                }

                tmpObject.trans.push(trans);
            });
            self.states.push(tmpObject);

        });

    };


    /**************
     **SIMULATION**
     *************/

    $scope.$watch('simulator.animated.currentState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('simulator.animated.transition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });
    $scope.$watch('simulator.animated.nextState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedState', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

    $scope.$watch('statediagram.selectedTransition', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            self.updateFunction();
        }
    });

}