$(document).ready(function() {
    var primarySortOrder = ['category', 'rarity', 'alphabetical'];
    var secondarySortCriteria = [];

    // Load card types from Cardtypes.txt and populate dropdown
    fetch('Cardtypes.txt')
        .then(response => response.text())
        .then(data => {
            secondarySortCriteria = data.split('\n').filter(type => type.trim() !== '');
            populateDropdown();
        });

    function populateDropdown() {
        var $dropdown = $('<select id="newTypeDropdown"><option value="">Select Card Type</option></select>');
        secondarySortCriteria.forEach(type => {
            $dropdown.append(`<option value="${type}">${type}</option>`);
        });
        $('.new-category').append($dropdown);
    }

    $('#sortButton').on('click', function() {
        var unsortedList = $('#cardList').val().trim().split('\n');

        fetchCardDetails(unsortedList).then(cards => {
            var sortedCards = sortCards(cards, primarySortOrder, secondarySortCriteria);
            displaySortedCards(sortedCards);
        });
    });

    $('#clearButton').on('click', function() {
        $('#sortedList').empty();
    });

    $('#priceButton').on('click', function() {
        $(this).toggleClass('highlighted');

        if ($(this).hasClass('highlighted')) {
            $('.card .price').show();
        } else {
            $('.card .price').hide();
        }
    });

    $('#printButton').on('click', function() {
        var printableContent = $('#sortedList').html();
        var printWindow = window.open('', '_blank');
        printWindow.document.open();
        printWindow.document.write('<html><head><title>Printable List</title>');
        printWindow.document.write('<style>');
        printWindow.document.write('body { font-family: Arial, sans-serif; }');
        printWindow.document.write('.section-label { font-size: 18px; font-weight: bold; margin-top: 10px; }');
        printWindow.document.write('</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<h1>' + $('#listName').val() + '</h1>');
        printWindow.document.write(printableContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    });

    // Make top-level sorting criteria items draggable
    $(".categories").sortable({
        items: '> .criteria-item:not(.new-category)',
        axis: 'x',
        tolerance: 'pointer', // Adjust tolerance for sensitivity
        distance: 10, // Adjust distance to trigger sorting earlier
        cursor: 'move', // Set cursor style during dragging
        containment: 'parent', // Limit movement within parent container
        update: function(event, ui) {
            primarySortOrder = $(this).sortable('toArray', { attribute: 'data-criteria' });
        },
        start: function(event, ui) {
            // Calculate the total width of sortable items dynamically
            var totalWidth = 0;
            $(this).children('.criteria-item:not(.new-category)').each(function() {
                totalWidth += $(this).outerWidth(true); // Include margin
            });
            $(this).sortable('option', 'containment', [0, 0, totalWidth, 0]); // Update containment dynamically
        }
    });

    // Disable dragging for subcriteria items
    $(".subcriteria").sortable({
        items: '> .criteria-item:not(.toggle-order)',
        axis: 'y',
        containment: 'parent',
        update: function(event, ui) {
            var criteriaType = $(this).closest('.criteria-item').data('criteria');
            if (criteriaType === 'category') {
                secondarySortCriteria = $(this).sortable('toArray', { attribute: 'data-criteria' });
            }
        }
    });

    // Add new type to the category list
    $(document).on('change', '#newTypeDropdown', function() {
        var newType = $(this).val();
        if (newType) {
            $('<div class="criteria-item" data-criteria="' + newType + '"><span>' + newType + '</span></div>')
                .insertBefore($(this).closest('.new-category'));
            $(this).remove();
            secondarySortCriteria.push(newType);

            // Refresh the sortable functionality
            $(".categories").sortable('refresh');
            $(".subcriteria").sortable('refresh');
        }
    });

    // Toggle order for subcriteria items
    $(document).on('click', '.toggle-order', function() {
        var $parent = $(this).closest('.subcriteria');
        var $items = $parent.children('.criteria-item:not(.toggle-order)');
        if ($items.length > 1) {
            var $first = $items.first();
            var $last = $items.last();
            $first.insertAfter($last);
        }
    });

    // Function to determine color based on card data
    function determineColor(cardData) {
        if (cardData.colors && cardData.colors.length > 0) {
            return cardData.colors.join(', ');
        } else {
            return 'Colorless';
        }
    }

    // Function to fetch details of card names from API
    function fetchCardDetails(cardNames) {
        var promises = cardNames.map(name => {
            return fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`)
                .then(response => response.json())
                .then(data => ({
                    name: data.name,
                    rarity: data.rarity,
                    color: determineColor(data),
                    price: data.prices.usd || '0.00',
                    type: data.type_line
                }))
                .catch(error => ({
                    name: name,
                    rarity: 'unknown',
                    color: 'unknown',
                    price: '0.00',
                    type: 'other'
                }));
        });
        return Promise.all(promises);
    }

    // Function to sort cards based on primary and secondary criteria
    function sortCards(cards, primarySortOrder, secondarySortCriteria) {
        return cards.sort((a, b) => {
            for (var i = 0; i < primarySortOrder.length; i++) {
                var criterion = primarySortOrder[i];
                if (criterion === 'category') {
                    var indexA = secondarySortCriteria.indexOf(a.type);
                    var indexB = secondarySortCriteria.indexOf(b.type);
                    if (indexA !== indexB) {
                        return indexA - indexB;
                    }
                } else if (criterion === 'rarity') {
                    var rarityOrder = ['common', 'uncommon', 'rare', 'mythic'];
                    if (rarityOrder.indexOf(a.rarity) !== rarityOrder.indexOf(b.rarity)) {
                        return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
                    }
                } else if (criterion === 'alphabetical') {
                    if (a.name !== b.name) {
                        return a.name.localeCompare(b.name);
                    }
                }
            }
            return 0;
        });
    }

    // Function to display sorted cards in the UI
    function displaySortedCards(cards) {
        $('#sortedList').empty();

        var groupedCards = groupCards(cards);
        Object.keys(groupedCards).forEach(group => {
            $('#sortedList').append(`<div class="section-label">${group}</div>`);
            groupedCards[group].forEach(card => {
                $('#sortedList').append(
                    `<div class="card">
                        ${card.name} 
                        <span class="price">$${card.price}</span>
                    </div>`
                );
            });
        });

        if ($('#priceButton').hasClass('highlighted')) {
            $('.card .price').show();
        } else {
            $('.card .price').hide();
        }
    }

    // Function to group cards by type
    function groupCards(cards) {
        var groupedCards = {};
        cards.forEach(card => {
            var groupKey = card.type;
            if (!groupedCards[groupKey]) {
                groupedCards[groupKey] = [];
            }
            groupedCards[groupKey].push(card);
        });
        return groupedCards;
    }
});
