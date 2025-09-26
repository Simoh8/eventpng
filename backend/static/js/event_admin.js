document.addEventListener('DOMContentLoaded', function() {
    // Function to toggle ticket fields based on has_tickets checkbox
    function toggleTicketFields() {
        var hasTickets = document.getElementById('id_has_tickets');
        var ticketType = document.getElementById('id_ticket_type').closest('.form-row');
        var maxAttendees = document.getElementById('id_max_attendees').closest('.form-row');
        
        if (hasTickets && ticketType && maxAttendees) {
            function updateFields() {
                if (hasTickets.checked) {
                    ticketType.style.display = 'block';
                    maxAttendees.style.display = 'block';
                } else {
                    ticketType.style.display = 'none';
                    maxAttendees.style.display = 'none';
                }
            }
            
            // Initial state
            updateFields();
            
            // Update on change
            hasTickets.addEventListener('change', updateFields);
        }
    }
    
    // Run the function when the page loads
    toggleTicketFields();
    
    // Also run when the inline formset is added/removed
    document.addEventListener('formset:added', toggleTicketFields);
    document.addEventListener('formset:removed', toggleTicketFields);
});
