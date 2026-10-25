(function () {
  'use strict';
  var events = window.HubGameEvents.create('screen-story');
  var runId = null;
  window.ScreenStoryHub = {
    start: function () { runId = events.runId(); },
    beat: function (beat) {
      if (beat.t === 'fx' && beat.kind === 'glitch') events.achievement('first_glitch');
      if (beat.t === 'fx' && beat.kind === 'webcam') events.achievement('camera_taped');
      if (beat.t === 'day' && beat.n >= 8) events.achievement('last_conversation');
    },
    complete: function () {
      if (!runId) return false;
      if (!events.runEnd(runId, { won: true, ending: 'let_me_in' })) return false;
      events.achievement('let_me_in');
      return true;
    }
  };
})();
