$(document).ready(function() {
    // Fixed primary sort order for main categories
    var primarySortOrder = ['Land', 'Token', 'Emblem'];
    
    // Default secondary sorting criteria order
    var secondarySortCriteria = ['color', 'rarity', 'alphabetical'];

    $('#sortButton').on('click', function() {
    $('#loadingIndicator').show(); // Show loading indicator
    var unsortedList = $('#cardList').val().trim().split('\n');
    fetchCardDetails(unsortedList).then(cards => {
        var sortedCards = sortCards(cards, primarySortOrder, secondarySortCriteria);
        displaySortedCards(sortedCards);
        $('#loadingIndicator').hide(); // Hide loading indicator
    }).catch(() => {
        alert('An error occurred while fetching card details.');
        $('#loadingIndicator').hide(); // Hide loading indicator even on error
    });
});

    $('#clearButton').on('click', function() {
        $('#sortedList').empty();
    });

    $('#priceButton').on('click', function() {
        $(this).toggleClass('highlighted');

        // Show/hide price based on USD button state
        if ($(this).hasClass('highlighted')) {
            $('.card .price').show();
        } else {
            $('.card .price').hide();
        }
    });

    $('#printButton').on('click', function() {
        // Generate printable view
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

    // Make criteria draggable and sortable
    $(".sorting-criteria").sortable({
        update: function(event, ui) {
            // Update the order of criteria items
            secondarySortCriteria = $(this).sortable('toArray', { attribute: 'data-criteria' });
        }
    });
});

function fetchCardDetails(cardNames) {
    var promises = cardNames.map(name => {
        return fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error fetching details for ${name}`);
                }
                return response.json();
            })
            .then(data => ({
                name: data.name,
                rarity: data.rarity,
                color: determineColor(data),
                price: data.prices.usd || '0.00',
                category: determineCategory(data)
            }))
            .catch(error => {
                console.error(error);
                return {
                    name: name,
                    rarity: 'unknown',
                    color: 'unknown',
                    price: '0.00',
                    category: 'other'
                };
            });
    });
    return Promise.all(promises);
}


// Function to determine category based on card properties
function determineCategory(cardData) {
    if (cardData.type_line.includes('Land')) {
        return 'Land';
    } else if (cardData.type_line.includes('Token')) {
        return 'Token';
    } else if (cardData.type_line.includes('Emblem')) {
        return 'Emblem';
    } else {
        return 'other'; // Default category if not identified
    }
}

// Function to determine color based on card data
function determineColor(cardData) {
    if (cardData.colors && cardData.colors.length > 0) {
        return cardData.colors.join(', '); // Example: Return colors as comma-separated string
    } else {
        return 'Colorless'; // Default to Colorless if no specific colors
    }
}

function sortCards(cards, primarySortOrder, secondarySortCriteria) {
    return cards.sort((a, b) => {
        // Compare categories based on primary sort order
        var primaryIndexA = primarySortOrder.indexOf(a.category);
        var primaryIndexB = primarySortOrder.indexOf(b.category);

        if (primaryIndexA !== primaryIndexB) {
            return primaryIndexA - primaryIndexB;
        }

        // If primary categories are the same, sort by the specified secondary criteria
        for (var i = 0; i < secondarySortCriteria.length; i++) {
            var criterion = secondarySortCriteria[i];
            if (criterion === 'color') {
                if (a.color !== b.color) {
                    return a.color.localeCompare(b.color);
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

    // If USD button is highlighted, show prices
    if ($('#priceButton').hasClass('highlighted')) {
        $('.card .price').show();
    } else {
        $('.card .price').hide();
    }
}

function groupCards(cards) {
    var groupedCards = {};
    cards.forEach(card => {
        var groupKey = card.category;
        if (!groupedCards[groupKey]) {
            groupedCards[groupKey] = [];
        }
        groupedCards[groupKey].push(card);
    });
    return groupedCards;
}
