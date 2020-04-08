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
        $ctrl.rate = 0;
        $ctrl.boards = [];
        $ctrl.comments = {};
        $ctrl.lists = {};

        $ctrl.markCkecked = markCkecked;
        $ctrl.setRate = setRate;

        activate();

        ////////////////

        function activate() {
            initRate()
            trelloApiClient
                .authorize()
                .then(onAuthorized, onAuthorizeFail);
        }

        function initRate() {
            var rate = window.localStorage.getItem('rate');

            if (rate === null) {
                setRate()
            } else {
                $ctrl.rate = rate;
            }
        }

        function setRate() {
            var rate;

            do {
                var inputRate = prompt('Введите рейт в час. (nолько число)', 0);
                rate = +inputRate;
            } while (isNaN(rate));

            window.localStorage.setItem('rate', rate);
            $ctrl.rate = rate;
        }

        function onAuthorized() {
            $ctrl.authorized = true;
            $ctrl.error = '';

            getMyComments();
        }

        function onAuthorizeFail() {
            $ctrl.error = 'Ошибка авторизации';
        }

        function getMyComments() {
            trelloApiClient.raw
                .get('/members/me/actions?filter=open&filter=commentCard&limit=1000')
                .then(function (response) {
                    $scope.$apply(function () {
                        var comments = _(response)
                            .orderBy('date', 'desc')
                            .value();

                        parseComments(comments);
                    })
                });
        }

        function parseComments(inComments) {
            if (inComments.length === 1000) {
                openToast('1000 actions reached!');
            }
            $ctrl.months = _(inComments)
                .filter(function (value) {
                    initComment(value);
                    return value._timed;
                })
                // Если данные по карточке неактуальны
                // .map(function (inComment) {
                //     return fetchCard(inComment);
                // })
                .orderBy('date', 'desc')
                .groupBy(function (inComment) {
                    return inComment.date.match(/\d\d\d\d-\d\d/)[0];
                })
                .value();

            calcSummary();
        }

        function calcSummary() {
            $ctrl.summary = _.mapValues($ctrl.months, function (inComments) {
                return _.reduce(inComments, function(result, comment) {
                    result.total += comment._hours;
                    
                    if (comment._checked) {
                        result.checked += comment._hours;
                    } else {
                        result.unchecked += comment._hours;
                    }

                    return result;
                }, {total: 0, checked: 0, unchecked: 0});
            });
        }

        function initComment(inComment) {
            var text = _.trim(inComment.data.text);
            inComment._checked = _.endsWith(text, CHECK_MARK);
            inComment._timed = _.startsWith(text, '~');

            if (inComment._timed) {
                var match = text.match(/~(?:(\d+)h)?\s*(?:(\d+)m)?/i);
                var hours = Number(match[1]) || 0;
                var minutes = Number(match[2]) || 0;

                inComment._hours = hours + minutes / 60;
            }
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

            return inComment;
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
                        calcSummary();
                    })
                });
        }

        function openToast(inText) {
            $mdToast.showSimple(inText);
        }
    }

})();

