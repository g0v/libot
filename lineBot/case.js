// https://cythilya.github.io/2017/03/12/uuid/
function _uuid() {
    var d = Date.now();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

var Case = function(userId, timestamp, type) {
   
    this.caseId = _uuid();
    this.location = null;
    this.userId = userId;    
    this.createTimestamp = timestamp; // case 成立的時間
    this.eventTimestamp = null;
    this.type = type;
    //this.fsm = new StateMachine(FSM_TEMPLATE);
    
}


module.exports = Case