(function () {
    'use strict';

    angular
        .module('app')
        .factory('trelloApiClient', trelloApiClient);

    /** @ngInject */
    function trelloApiClient(Trello, $q) {
        return {
            raw: Trello,
            authorize: authorize
        };

        ////////////////

        function authorize() {
            var deferred = $q.defer();

            Trello.authorize({
                type: 'popup',
                name: 'Nitro-N Trello client',
                scope: {
                    read: true,
                    write: true,
                    account: true
                },
                expiration: 'never',
                success: deferred.resolve,
                error: deferred.reject
            });
            return deferred.promise;
        }
    }

})();

