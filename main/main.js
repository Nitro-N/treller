(function () {
    'use strict';

    angular
        .module('app')
        .component('main', {
            templateUrl: 'main/main.html',
            controller: MainController,
            bindings: {}
        });

    /** @ngInject */
    function MainController($scope, $element, $attrs, $mdToast, trelloApiClient, _) {
        var $ctrl = this;
        var CHECK_MARK = ' [V]';
        $ctrl.title = 'MainController';

        $ctrl.authorized = false;
        $ctrl.boards = [];
        $ctrl.comments = {};
        $ctrl.lists = {};

        $ctrl.markCkecked = markCkecked;

        activate();

        ////////////////

        function activate() {
            trelloApiClient
                .authorize()
                .then(onAuthorized, onAuthorizeFail);
        }

        function onAuthorized() {
            $ctrl.authorized = true;
            $ctrl.error = '';

            getMyBoards();
        }

        function onAuthorizeFail() {
            $ctrl.error = 'Ошибка авторизации';
        }

        function getMyBoards() {
            trelloApiClient.raw
                .get('/members/me/boards?organization=true&filter=open&actions=commentCard')
                .then(function (response) {
                    $scope.$apply(function () {
                        var boards = _(response)
                            .orderBy('dateLastView', 'desc')
                            .value();

                        $ctrl.boards = boards;
                        parseComments();
                    })
                });
        }

        function parseComments() {
            trelloApiClient.raw
                .get('/members/me/actions?entities=true&filter=commentCard&memberCreator=false&limit=1000')
                .then(function (response) {
                    $scope.$apply(function () {
                        if (response.length === 1000) {
                            openToast('1000 actions reached!');
                        }
                        $ctrl.comments = _(response)
                            .filter(function (value) {
                                initComment(value);
                                return value._timed;
                            })
                            .orderBy('date', 'desc')
                            .groupBy('data.board.id')
                            .value();

                        _.each($ctrl.comments, function (comments) {
                            _.each(comments, function (comment) {
                                fetchCard(comment);
                            });
                        });
                    })
                });
        }


        function initComment(inComment) {
            var text = _.trim(inComment.data.text);
            inComment._checked = _.endsWith(text, CHECK_MARK);
            inComment._timed = _.startsWith(text, '~');
        }

        function fetchCard(inComment) {
            var card = inComment.data.card;
            var list = inComment.data.list;

            trelloApiClient.raw
                .get('/cards/' + card.id + '?list=true&fields=name&list_fields=name')
                .then(function (response) {
                    $scope.$apply(function () {
                        _.assign(card, response);
                        _.assign(list, response.list);
                    })
                });
        }

        function markCkecked(inComment) {
            var value = inComment.data.text;

            if (inComment._checked) {
                value += CHECK_MARK;
            } else {
                value = _.trimEnd(value, CHECK_MARK);
            }

            trelloApiClient.raw
                .put('actions/' + inComment.id + '/text', {value: value})
                .then(function (response) {
                    $scope.$apply(function () {
                        _.assign(inComment, response);
                        initComment(inComment);
                    })
                });
        }

        function openToast(inText) {
            $mdToast.showSimple(inText);
        }
    }

})();

