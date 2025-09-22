import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';

const EventPinModal = ({ show, onHide, event, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin) {
      setError('Please enter the PIN code');
      return;
    }
  
    setIsLoading(true);
    setError('');
  
    // Get CSRF token from cookies
    const getCookie = (name) => {
      let cookieValue = null;
      if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.substring(0, name.length + 1) === (name + '=')) {
            cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
            break;
          }
        }
      }
      return cookieValue;
    };
  
    const csrftoken = getCookie('csrftoken');
  
    try {
      const response = await axios({
        method: 'post',
        url: API_ENDPOINTS.VERIFY_EVENT_PIN(event.slug),
        data: { pin },
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken,
          'X-Requested-With': 'XMLHttpRequest'
        },
        withCredentials: true
      });
      
      if (response.data.success) {
        // Store verification in session storage
        sessionStorage.setItem(`event_${event.slug}_verified`, 'true');
        onSuccess();
        onHide();
      } else {
        setError(response.data.error || 'Invalid PIN code. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Enter PIN for {event.name}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <p>This is a private event. Please enter the PIN to continue.</p>
          <Form.Group className="mb-3">
            <Form.Label>PIN Code</Form.Label>
            <Form.Control
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              maxLength={6}
              autoFocus
            />
            {error && <div className="text-danger mt-2">{error}</div>}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'Submit'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EventPinModal;
