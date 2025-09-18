from django.core.mail.backends.console import EmailBackend as ConsoleEmailBackend
import sys

class SilentConsoleEmailBackend(ConsoleEmailBackend):
    """
    A console email backend that doesn't log the actual email content.
    Only shows a success message with recipient and subject.
    """
    def write_message(self, message):
        msg = message.message()
        
        # Extract basic info without logging the full message
        to_email = ', '.join(message.to) if hasattr(message, 'to') and message.to else 'No recipient'
        subject = message.subject if hasattr(message, 'subject') else 'No subject'
        
        # Create a simple message to write to the console
        output = [
            "\nEmail sent to: {}".format(to_email),
            "Subject: {}".format(subject),
            "Email content has been suppressed in console output.",
            "-" * 79,
            ""  # Extra newline for better readability
        ]
        
        # Write the output to the stream
        self.stream.write("\n".join(output))
        
        # Return the message data as bytes
        return msg.as_bytes()
