(function () {
    'use strict';

    angular
        .module('app', [
            'ngMaterial'
        ])
        .constant('Trello', window.Trello)
        .constant('_', window._);

})();