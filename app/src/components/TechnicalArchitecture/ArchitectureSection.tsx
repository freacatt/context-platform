import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

interface SectionProps {
    title: string;
    data: any;
    isAdvanced?: boolean;
    onUpdate?: (path: string[], value: any) => void;
    readOnly?: boolean;
}

const formatKey = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const ArrayField: React.FC<{
    value: any[];
    onChange: (value: any[]) => void;
    readOnly?: boolean;
}> = ({ value, onChange, readOnly }) => {
    if (readOnly) {
        return (
            <ul className="list-disc list-inside ml-2">
                {value.map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-700">{typeof item === 'object' ? JSON.stringify(item) : item}</li>
                ))}
            </ul>
        );
    }

    const handleAdd = () => {
        onChange([...value, ""]);
    };

    const handleRemove = (index: number) => {
        const newValue = [...value];
        newValue.splice(index, 1);
        onChange(newValue);
    };

    const handleChange = (index: number, val: string) => {
        const newValue = [...value];
        newValue[index] = val;
        onChange(newValue);
    };

    return (
        <div className="space-y-2">
            {value.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                    {typeof item === 'object' ? (
                         <div className="flex-1 p-2 bg-gray-50 rounded border text-sm">
                            {/* Simple object rendering for now, could be improved */}
                            {Object.entries(item).map(([k, v]) => (
                                <div key={k} className="flex gap-2">
                                    <span className="font-semibold">{k}:</span>
                                    <span>{String(v)}</span>
                                </div>
                            ))}
                         </div>
                    ) : (
                        <input
                            type="text"
                            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                            value={item}
                            onChange={(e) => handleChange(idx, e.target.value)}
                        />
                    )}
                    <button
                        onClick={() => handleRemove(idx)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
            <button
                onClick={handleAdd}
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium px-2 py-1 rounded hover:bg-purple-50 transition-colors"
            >
                <Plus size={16} /> Add Item
            </button>
        </div>
    );
};

const ObjectField: React.FC<{
    value: Record<string, any>;
    onChange: (value: Record<string, any>) => void;
    readOnly?: boolean;
    path: string[];
}> = ({ value, onChange, readOnly, path }) => {
    // Determine if this is a "leaf" object (values are not objects/arrays)
    // or a container object
    
    return (
        <div className="space-y-4">
            {Object.entries(value).map(([key, val]) => (
                <div key={key} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide flex justify-between items-center">
                        {formatKey(key)}
                    </h5>
                    
                    <FieldValue 
                        value={val} 
                        path={[...path, key]} 
                        onUpdate={readOnly ? undefined : (subPath, newValue) => {
                             const newObj = { ...value };
                             // subPath is relative to the current object. 
                             // Since FieldValue is called with path [...path, key],
                             // and it calls onUpdate with that full path relative to root?
                             // Wait, FieldValue's onUpdate expects full path? 
                             // No, let's look at how FieldValue calls onUpdate.
                             
                             // Actually, let's simplify. 
                             // We are inside an object. We want to update `key`.
                             // But `val` might be complex.
                             
                             // If `val` is simple, we just update newObj[key] = newValue.
                             // If `val` is complex, FieldValue handles it recursively?
                             
                             // The recursion in FieldValue passes `path` which accumulates keys.
                             // But here we need to intercept to update our local state `value`.
                             
                             // Let's rely on the parent's onUpdate mechanism passed down to FieldValue
                             // But wait, FieldValue takes `path` and `onUpdate`.
                             // `onUpdate` takes `(path, value)`.
                             
                             // If we pass the parent `onUpdate` directly, it will work if `path` is correct relative to root.
                             // But here we want to render specific UI for objects.
                        }}
                        // Actually, we should just delegate to FieldValue but wrap the onUpdate
                        // But FieldValue is recursive. 
                        
                        // Let's look at FieldValue again.
                    />
                     {/* 
                        Re-implementing FieldValue logic here slightly to handle the layout 
                        better than the previous recursive implementation 
                     */}
                     {typeof val === 'object' && val !== null ? (
                        Array.isArray(val) ? (
                            <ArrayField 
                                value={val} 
                                onChange={(newArr) => {
                                    const newObj = { ...value, [key]: newArr };
                                    onChange(newObj);
                                }} 
                                readOnly={readOnly}
                            />
                        ) : (
                            <ObjectField 
                                value={val} 
                                onChange={(newSubObj) => {
                                    const newObj = { ...value, [key]: newSubObj };
                                    onChange(newObj);
                                }}
                                readOnly={readOnly}
                                path={[...path, key]}
                            />
                        )
                     ) : (
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white"
                            value={val as string}
                            onChange={(e) => {
                                const newObj = { ...value, [key]: e.target.value };
                                onChange(newObj);
                            }}
                            readOnly={readOnly}
                        />
                     )}
                </div>
            ))}
        </div>
    );
};


const FieldValue: React.FC<{
    value: any;
    path: string[];
    onUpdate?: (path: string[], value: any) => void;
    readOnly?: boolean;
}> = ({ value, path, onUpdate, readOnly }) => {
    
    // 1. Arrays
    if (Array.isArray(value)) {
        return (
            <ArrayField 
                value={value} 
                onChange={(newVal) => onUpdate && onUpdate(path, newVal)} 
                readOnly={readOnly} 
            />
        );
    }

    // 2. Objects
    if (typeof value === 'object' && value !== null) {
        return (
            <div className="grid grid-cols-1 gap-4">
                {Object.entries(value).map(([key, val]) => (
                    <div key={key} className="bg-white p-3 rounded border border-gray-200 shadow-sm hover:border-purple-200 transition-colors">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            {formatKey(key)}
                        </label>
                        <FieldValue 
                            value={val} 
                            path={[...path, key]} 
                            onUpdate={onUpdate} 
                            readOnly={readOnly} 
                        />
                    </div>
                ))}
            </div>
        );
    }

    // 3. Simple Values (Strings, Numbers, Booleans)
    if (readOnly) {
        return <div className="text-sm text-gray-800 py-1">{String(value)}</div>;
    }

    return (
        <input
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            value={value as string}
            onChange={(e) => onUpdate && onUpdate(path, e.target.value)}
        />
    );
};

export const ArchitectureSection: React.FC<SectionProps> = ({ title, data, isAdvanced, onUpdate, readOnly }) => {
    if (!data) return null;

    return (
        <div className={`mb-8 bg-white rounded-xl shadow-sm border ${isAdvanced ? 'border-purple-100' : 'border-gray-200'} overflow-hidden`}>
            <div className={`px-6 py-4 border-b ${isAdvanced ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-100'}`}>
                <h3 className={`text-lg font-semibold flex items-center gap-2 ${isAdvanced ? 'text-purple-900' : 'text-gray-900'}`}>
                    {title}
                    {isAdvanced && (
                        <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-medium">
                            Advanced
                        </span>
                    )}
                </h3>
            </div>
            
            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(data).map(([key, value]) => (
                        <div key={key} className="flex flex-col">
                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <div className={`w-1 h-4 rounded-full ${isAdvanced ? 'bg-purple-400' : 'bg-blue-400'}`}></div>
                                {formatKey(key)}
                            </h4>
                            <div className="flex-grow">
                                <FieldValue 
                                    value={value} 
                                    path={[key]} 
                                    onUpdate={onUpdate ? (subPath, val) => onUpdate([key, ...subPath], val) : undefined}
                                    readOnly={readOnly}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
