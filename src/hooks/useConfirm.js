import { useState } from 'react'

export function useConfirm() {
  const [modal, setModal] = useState({ show: false, message: '', onConfirm: null })
  const confirm    = (message, onConfirm) => setModal({ show: true, message, onConfirm })
  const closeModal = () => setModal({ show: false, message: '', onConfirm: null })
  return { modal, confirm, closeModal }
}
