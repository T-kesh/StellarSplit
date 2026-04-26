import * as React from 'react'
import {
  connectWallet,
  EXPECTED_STELLAR_NETWORK,
  getFreighterNetworkPassphrase,
  getNetworkLabel,
  getNetworkMismatchMessage,
  getWalletPublicKey,
  HORIZON_URL,
  isExpectedNetwork,
  isFreighterInstalled,
  signWithFreighter,
  SOROBAN_NETWORK_PASSPHRASE,
  SOROBAN_RPC_URL,
} from '../config/walletConfig'
import {
  getStoredActiveUserId,
  setStoredActiveUserId,
} from '../utils/session'
import { sessionStore, SessionKey } from '../utils/sessionStore'

type WalletContextValue = {
  publicKey: string | null
  activeUserId: string | null
  isConnected: boolean
  isConnecting: boolean
  isRefreshing: boolean
  hasFreighter: boolean
  error: string | null
  networkPassphrase: string
  requiredNetworkPassphrase: string
  requiredNetworkLabel: string
  rpcUrl: string
  horizonUrl: string
  walletNetworkPassphrase: string | null
  walletNetworkLabel: string
  isOnAllowedNetwork: boolean
  canTransact: boolean
  lastConnectedAccount: string | null
  connect: () => Promise<void>
  disconnect: () => void
  refresh: () => Promise<void>
  clearError: () => void
  signTransaction: (txXdr: string) => Promise<string>
}

const WalletContext = React.createContext<WalletContextValue | undefined>(undefined)

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return ''
}

function isNotConnectedError(error: unknown): boolean {
  return getErrorMessage(error).toLowerCase().includes('not connected')
}

function getUserFacingError(error: unknown): string | null {
  const message = getErrorMessage(error)
  if (!message) {
    return 'Wallet error'
  }

  const lower = message.toLowerCase()
  if (lower.includes('not connected')) {
    return null
  }
  if (lower.includes('not installed')) {
    return 'Freighter is not installed in this browser.'
  }
  if (lower.includes('rejected') || lower.includes('declined') || lower.includes('denied')) {
    return 'You rejected the wallet request.'
  }

  return message
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = React.useState<string | null>(null)
  const [isConnecting, setIsConnecting] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [hasFreighter, setHasFreighter] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [walletNetworkPassphrase, setWalletNetworkPassphrase] = React.useState<string | null>(null)
  const [lastConnectedAccount, setLastConnectedAccount] = React.useState<string | null>(
    getStoredActiveUserId(),
  )
  const freighterCheckAttempts = React.useRef(0)

  const activeUserId = publicKey ?? lastConnectedAccount ?? getStoredActiveUserId()
  const isOnAllowedNetwork = React.useMemo(
    () => isExpectedNetwork(walletNetworkPassphrase),
    [walletNetworkPassphrase],
  )
  const walletNetworkLabel = React.useMemo(
    () => getNetworkLabel(walletNetworkPassphrase),
    [walletNetworkPassphrase],
  )
  const canTransact = !!publicKey && isOnAllowedNetwork

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  const applyNetworkStatus = React.useCallback(async () => {
    const passphrase = await getFreighterNetworkPassphrase()
    setWalletNetworkPassphrase(passphrase)
    if (passphrase && !isExpectedNetwork(passphrase)) {
      setError(getNetworkMismatchMessage(passphrase))
    }
  }, [])

  const refresh = React.useCallback(async () => {
    setIsRefreshing(true)

    try {
      const installed = await isFreighterInstalled()
      setHasFreighter(installed)

      if (!installed) {
        setPublicKey(null)
        setWalletNetworkPassphrase(null)
        setError(null)
        return
      }

      try {
        const key = await getWalletPublicKey()
        setPublicKey(key)
        setLastConnectedAccount(key)
        setStoredActiveUserId(key)
        setError(null)
        await applyNetworkStatus()
      } catch (refreshError) {
        if (isNotConnectedError(refreshError)) {
          setPublicKey(null)
          setWalletNetworkPassphrase(null)
          setError(null)
          return
        }

        setPublicKey(null)
        setWalletNetworkPassphrase(null)
        setError(getUserFacingError(refreshError))
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [applyNetworkStatus])

  const connect = React.useCallback(async () => {
    if (isConnecting) {
      return
    }

    const installed = await isFreighterInstalled()
    setHasFreighter(installed)

    if (!installed) {
      setError('Freighter is not installed in this browser.')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const key = await connectWallet()
      setPublicKey(key)
      setLastConnectedAccount(key)
      setStoredActiveUserId(key)
      await applyNetworkStatus()
    } catch (connectError) {
      const userError = getUserFacingError(connectError)
      if (userError) {
        setError(userError)
      }
      setPublicKey(null)
      setWalletNetworkPassphrase(null)
    } finally {
      setIsConnecting(false)
    }
  }, [applyNetworkStatus, isConnecting])

  const disconnect = React.useCallback(() => {
    setPublicKey(null)
    setLastConnectedAccount(null)
    setWalletNetworkPassphrase(null)
    setError(null)
    setStoredActiveUserId(null)
  }, [])

  // Handle cross-tab synchronization
  React.useEffect(() => {
    return sessionStore.subscribe((key, value) => {
      if (key === SessionKey.ACTIVE_USER_ID) {
        if (!value) {
          setPublicKey(null)
          setLastConnectedAccount(null)
        } else {
          setLastConnectedAccount(value)
        }
      }
    })
  }, [])

  const signTransaction = React.useCallback(
    async (txXdr: string) => {
      if (!publicKey) {
        throw new Error('Connect Freighter before signing.')
      }

      if (!walletNetworkPassphrase) {
        throw new Error('Freighter network is unavailable. Refresh the wallet and try again.')
      }

      if (!isExpectedNetwork(walletNetworkPassphrase)) {
        throw new Error(getNetworkMismatchMessage(walletNetworkPassphrase))
      }

      return signWithFreighter(txXdr, walletNetworkPassphrase)
    },
    [publicKey, walletNetworkPassphrase],
  )

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined
    }

    const handleFocus = () => {
      void refresh()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refresh])

  React.useEffect(() => {
    if (hasFreighter) {
      freighterCheckAttempts.current = 0
      return
    }

    if (freighterCheckAttempts.current >= 3) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      freighterCheckAttempts.current += 1
      void refresh()
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [hasFreighter, refresh])

  const value = React.useMemo<WalletContextValue>(
    () => ({
      publicKey,
      activeUserId,
      isConnected: !!publicKey,
      isConnecting,
      isRefreshing,
      hasFreighter,
      error,
      networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
      requiredNetworkPassphrase: EXPECTED_STELLAR_NETWORK.passphrase,
      requiredNetworkLabel: EXPECTED_STELLAR_NETWORK.label,
      rpcUrl: SOROBAN_RPC_URL,
      horizonUrl: HORIZON_URL,
      walletNetworkPassphrase,
      walletNetworkLabel,
      isOnAllowedNetwork,
      canTransact,
      lastConnectedAccount,
      connect,
      disconnect,
      refresh,
      clearError,
      signTransaction,
    }),
    [
      activeUserId,
      canTransact,
      connect,
      disconnect,
      error,
      hasFreighter,
      isConnecting,
      isOnAllowedNetwork,
      isRefreshing,
      lastConnectedAccount,
      publicKey,
      refresh,
      signTransaction,
      walletNetworkLabel,
      walletNetworkPassphrase,
    ],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet(): WalletContextValue {
  const context = React.useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return context
}
