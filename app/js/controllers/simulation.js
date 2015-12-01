angular
  .module('myApp')
  .controller('simulationCtrl', simulationCtrl);

function getMock(){
    return {
      startState: 's0',
      finalStates: ['s5'],
      transitions: [
        ['s0', 'h', 's1'],
        ['s1', 'e', 's2'],
        ['s2', 'l', 's3'],
        ['s3', 'l', 's4'],
        ['s4', 'o', 's5'],
        ['s5', 'h', 's1']
      ]
    };
}

function simulationCtrl($scope){
  $scope.config = getMock();
  $scope.automaton = new DFA($scope.config);
  $scope.inputWord = '';


  $scope.run = function(){
    $scope.automaton.setInput($scope.inputWord);
    $scope.automaton.run();
  }

  $scope.step = function(){
    validateInput();
    $scope.automaton.step();
  }

  $scope.undo = function(){
    validateInput();
    $scope.automaton.undo();
  }

  $scope.reset = function(){
    validateInput();
    $scope.automaton.reset();
  }

  function validateInput(){ 
    if($scope.automaton.input != $scope.inputWord){
      $scope.automaton.setInput($scope.inputWord);
      $scope.automaton.reset();
    }
  }

}
