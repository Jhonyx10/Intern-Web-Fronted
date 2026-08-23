import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    User,
    Lock,
    Building2,
    Palette,
    Upload,
    Check,
    AlertCircle,
    Loader2,
    RefreshCw,
    Shield,
    Eye,
    EyeOff
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useSettings, useUpdateProfile, useUpdatePassword, useUpdateDeanSettings } from '@/lib/queries/settings'
import { THEME_PRESETS } from '@/context/ThemeContext'
import OCCLOGO from '@/assets/OCC logo.webp'

export function SettingsPage() {
    const { user } = useAuth()
    const isDeanOrAdmin = user?.role?.name === 'dean' || user?.role?.name === 'program_head'

    const [activeTab, setActiveTab] = useState<'profile' | 'general'>('profile')

    // Profile state
    const [name, setName] = useState(user?.name || '')
    const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
    const [profileError, setProfileError] = useState<string | null>(null)

    // Password state
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
    const [passwordError, setPasswordError] = useState<string | null>(null)

    // General / Dean settings state
    const { data: settings, isLoading: isLoadingSettings } = useSettings()
    const [departmentName, setDepartmentName] = useState('')
    const [selectedColor, setSelectedColor] = useState('#0b6e4f')
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const [removeLogo, setRemoveLogo] = useState(false)
    const [generalSuccess, setGeneralSuccess] = useState<string | null>(null)
    const [generalError, setGeneralError] = useState<string | null>(null)

    const updateProfileMutation = useUpdateProfile()
    const updatePasswordMutation = useUpdatePassword()
    const updateDeanSettingsMutation = useUpdateDeanSettings()

    useEffect(() => {
        if (user?.name) {
            setName(user.name)
        }
    }, [user])

    useEffect(() => {
        if (settings) {
            setDepartmentName(settings.department_name || '')
            setSelectedColor(settings.theme_color || '#0b6e4f')
            setLogoPreview(settings.logo_url || null)
        }
    }, [settings])

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setProfileSuccess(null)
        setProfileError(null)

        if (!name.trim()) {
            setProfileError('Name cannot be empty.')
            return
        }

        updateProfileMutation.mutate(
            { name: name.trim() },
            {
                onSuccess: (data) => {
                    setProfileSuccess(data.message || 'Profile updated successfully.')
                },
                onError: (err: any) => {
                    setProfileError(err?.response?.data?.message || 'Failed to update profile.')
                },
            }
        )
    }

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setPasswordSuccess(null)
        setPasswordError(null)

        if (!currentPassword) {
            setPasswordError('Please enter your current password.')
            return
        }
        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters long.')
            return
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match.')
            return
        }

        updatePasswordMutation.mutate(
            {
                current_password: currentPassword,
                password: newPassword,
                password_confirmation: confirmPassword,
            },
            {
                onSuccess: (data) => {
                    setPasswordSuccess(data.message || 'Password changed successfully.')
                    setCurrentPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                },
                onError: (err: any) => {
                    const msg =
                        err?.response?.data?.errors?.current_password?.[0] ||
                        err?.response?.data?.message ||
                        'Failed to update password.'
                    setPasswordError(msg)
                },
            }
        )
    }

    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setLogoFile(file)
            setRemoveLogo(false)
            setLogoPreview(URL.createObjectURL(file))
        }
    }

    const handleRemoveLogo = () => {
        setLogoFile(null)
        setRemoveLogo(true)
        setLogoPreview(null)
    }

    const handleGeneralSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setGeneralSuccess(null)
        setGeneralError(null)

        const matchedPreset = THEME_PRESETS.find(
            (p) => p.hex.toLowerCase() === selectedColor.toLowerCase()
        )

        updateDeanSettingsMutation.mutate(
            {
                department_name: departmentName.trim(),
                logo: logoFile,
                remove_logo: removeLogo,
                theme_color: selectedColor,
                theme_color_hover: matchedPreset?.hover,
                theme_color_soft: matchedPreset?.soft,
            },
            {
                onSuccess: (data) => {
                    setGeneralSuccess(data.message || 'Department settings saved successfully.')
                    setLogoFile(null)
                    setRemoveLogo(false)
                },
                onError: (err: any) => {
                    setGeneralError(err?.response?.data?.message || 'Failed to save department settings.')
                },
            }
        )
    }

    return (
        <section className="space-y-6 pb-12">
            {/* Header */}
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">Preferences</p>
                <h1 className="text-2xl font-bold text-[var(--color-ink)]">Account &amp; System Settings</h1>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                    Manage your personal account details, password, and department branding preferences.
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[var(--color-line)] gap-2">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${activeTab === 'profile'
                        ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                        : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                        }`}
                >
                    <User size={16} /> Profile &amp; Password
                </button>

                {isDeanOrAdmin && (
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${activeTab === 'general'
                            ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                            : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                            }`}
                    >
                        <Building2 size={16} /> Department &amp; Theme Settings
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 uppercase">
                            Dean Only
                        </span>
                    </button>
                )}
            </div>

            {/* TAB 1: Profile & Password */}
            {activeTab === 'profile' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="grid gap-6 md:grid-cols-2"
                >
                    {/* Change Profile Name */}
                    <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-5">
                        <div className="flex items-center gap-3 border-b border-[var(--color-line)] pb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <User size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-[var(--color-ink)]">Personal Information</h3>
                                <p className="text-xs text-[var(--color-muted)]">Update your display name in the system</p>
                            </div>
                        </div>

                        {profileSuccess && (
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 font-semibold border border-emerald-200">
                                <Check size={16} className="text-emerald-600 shrink-0" />
                                <span>{profileSuccess}</span>
                            </div>
                        )}

                        {profileError && (
                            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 font-semibold border border-rose-200">
                                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                                <span>{profileError}</span>
                            </div>
                        )}

                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    disabled
                                    value={user?.email || ''}
                                    className="w-full rounded-xl border border-[var(--color-line)] bg-slate-100/80 px-3.5 py-2.5 text-xs text-[var(--color-muted)] font-medium cursor-not-allowed"
                                />
                                <p className="text-[11px] text-[var(--color-muted)] mt-1">Email cannot be changed directly.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your full name"
                                    className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-xs text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] font-medium"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={updateProfileMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                            >
                                {updateProfileMutation.isPending ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" /> Updating...
                                    </>
                                ) : (
                                    'Save Profile Changes'
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Change Password */}
                    <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-5">
                        <div className="flex items-center gap-3 border-b border-[var(--color-line)] pb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-[var(--color-ink)]">Security &amp; Password</h3>
                                <p className="text-xs text-[var(--color-muted)]">Ensure your account uses a strong password</p>
                            </div>
                        </div>

                        {passwordSuccess && (
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 font-semibold border border-emerald-200">
                                <Check size={16} className="text-emerald-600 shrink-0" />
                                <span>{passwordSuccess}</span>
                            </div>
                        )}

                        {passwordError && (
                            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 font-semibold border border-rose-200">
                                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                                <span>{passwordError}</span>
                            </div>
                        )}

                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 pr-10 text-xs text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Min 8 characters"
                                        className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 pr-10 text-xs text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter new password"
                                    className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-xs text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={updatePasswordMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                            >
                                {updatePasswordMutation.isPending ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" /> Updating...
                                    </>
                                ) : (
                                    'Update Password'
                                )}
                            </button>
                        </form>
                    </div>
                </motion.div>
            )}

            {/* TAB 2: General & Department Settings (Dean only) */}
            {activeTab === 'general' && isDeanOrAdmin && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                >
                    {generalSuccess && (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs text-emerald-800 font-semibold border border-emerald-200">
                            <Check size={16} className="text-emerald-600 shrink-0" />
                            <span>{generalSuccess}</span>
                        </div>
                    )}

                    {generalError && (
                        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-xs text-rose-800 font-semibold border border-rose-200">
                            <AlertCircle size={16} className="text-rose-600 shrink-0" />
                            <span>{generalError}</span>
                        </div>
                    )}

                    <form onSubmit={handleGeneralSubmit} className="space-y-6">
                        {/* Department Name & Branding */}
                        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-6">
                            <div className="flex items-center gap-3 border-b border-[var(--color-line)] pb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[var(--color-ink)]">Department General Settings</h3>
                                    <p className="text-xs text-[var(--color-muted)]">Configure official department identity and logo</p>
                                </div>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">
                                            Department / College Name
                                        </label>
                                        <input
                                            type="text"
                                            value={departmentName}
                                            onChange={(e) => setDepartmentName(e.target.value)}
                                            placeholder="e.g. College of Computing Studies"
                                            className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-xs text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] font-medium"
                                        />
                                    </div>

                                    {/* Upload Department Logo */}
                                    <div>
                                        <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">
                                            Department Logo
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <div className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-[var(--color-line)] bg-slate-50 p-2 shadow-inner">
                                                <img
                                                    src={logoPreview || OCCLOGO}
                                                    alt="Department Logo"
                                                    className="h-full w-full object-contain"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] shadow-sm hover:bg-slate-50 transition">
                                                    <Upload size={14} className="text-[var(--color-accent)]" />
                                                    Upload New Logo
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleLogoFileChange}
                                                        className="hidden"
                                                    />
                                                </label>

                                                {logoPreview && (
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveLogo}
                                                        className="block text-[11px] font-semibold text-rose-600 hover:underline"
                                                    >
                                                        Remove Logo (Use Default OCC Logo)
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-[var(--color-muted)] mt-2">
                                            If no logo is set, the system automatically uses the standard OCC logo.
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 space-y-3">
                                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Logo Preview Card</p>
                                    <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-white p-4 shadow-sm">
                                        <img
                                            src={logoPreview || OCCLOGO}
                                            alt="Preview"
                                            className="h-10 w-10 object-contain"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-[var(--color-ink)]">
                                                {departmentName || user?.course?.name || 'College Department'}
                                            </p>
                                            <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase">
                                                Active Brand Logo
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Color Theme Selector */}
                        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-6">
                            <div className="flex items-center gap-3 border-b border-[var(--color-line)] pb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                                    <Palette size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[var(--color-ink)]">System Color Theme</h3>
                                    <p className="text-xs text-[var(--color-muted)]">Select primary theme color applied to all pages, buttons, and navigation</p>
                                </div>
                            </div>

                            {/* Preset Swatches */}
                            <div>
                                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-3">
                                    Theme Palette Presets
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                    {THEME_PRESETS.map((preset) => {
                                        const isSelected = selectedColor.toLowerCase() === preset.hex.toLowerCase()

                                        return (
                                            <button
                                                key={preset.hex}
                                                type="button"
                                                onClick={() => setSelectedColor(preset.hex)}
                                                className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition ${isSelected
                                                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] ring-2 ring-[var(--color-accent)]'
                                                    : 'border-[var(--color-line)] bg-white hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div
                                                    className="h-8 w-8 rounded-full shadow-md flex items-center justify-center text-white"
                                                    style={{ backgroundColor: preset.hex }}
                                                >
                                                    {isSelected && <Check size={16} />}
                                                </div>
                                                <span className="text-xs font-bold text-[var(--color-ink)]">{preset.name}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Custom Color Input */}
                            <div className="flex items-center gap-4 pt-2 border-t border-[var(--color-line)]">
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
                                        Custom Accent Color (Hex)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={selectedColor}
                                            onChange={(e) => setSelectedColor(e.target.value)}
                                            className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--color-line)] bg-transparent p-1"
                                        />
                                        <input
                                            type="text"
                                            value={selectedColor}
                                            onChange={(e) => setSelectedColor(e.target.value)}
                                            className="w-28 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-xs font-mono font-bold uppercase text-[var(--color-ink)] outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[11px] font-semibold text-[var(--color-muted)]">Live Theme Preview</p>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                                            style={{ backgroundColor: selectedColor }}
                                        >
                                            Primary Button
                                        </span>
                                        <span
                                            className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold"
                                            style={{ backgroundColor: `${selectedColor}20`, color: selectedColor }}
                                        >
                                            Soft Badge
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[var(--color-line)] flex justify-end">
                                <button
                                    type="submit"
                                    disabled={updateDeanSettingsMutation.isPending}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                                >
                                    {updateDeanSettingsMutation.isPending ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" /> Saving Settings...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={14} /> Save Department Settings
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            )}
        </section>
    )
}

export default SettingsPage
